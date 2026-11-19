"""Money: integer minor units + ISO 4217 currency.

Every amount travels with its currency. The decimal places come from the vendored ISO 4217
table (app/shared/data/iso4217.json, maintenance agency list), never from assumptions
about a country: RWF and UGX have 0, USD/EUR/KES/NGN 2, KWD 3. Rwanda is one ordinary case.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal, InvalidOperation
from functools import lru_cache
from pathlib import Path
from typing import Any

_TABLE = Path(__file__).parent / "data" / "iso4217.json"


class UnknownCurrencyError(ValueError):
    """The code is not an ISO 4217 currency a kitchen can use."""


class InexactAmountError(ValueError):
    """The amount has more decimals than the currency allows (it would need rounding)."""


@lru_cache(maxsize=1)
def _currencies() -> dict[str, dict[str, Any]]:
    data: dict[str, dict[str, Any]] = json.loads(_TABLE.read_text(encoding="utf-8"))["currencies"]
    return data


def is_currency(code: str | None, *, allow_funds: bool = False) -> bool:
    """True for an ISO 4217 code a kitchen can price in (fund codes only when allowed)."""
    if not code:
        return False
    entry = _currencies().get(code.upper())
    return entry is not None and (allow_funds or not entry.get("fund", False))


def normalise_currency(code: str) -> str:
    """Upper-case ISO code, or UnknownCurrencyError."""
    value = (code or "").strip().upper()
    if not is_currency(value):
        raise UnknownCurrencyError(f"'{code}' is not an ISO 4217 currency code")
    return value


def minor_units(code: str) -> int:
    """Decimal places of the currency (RWF 0, USD 2, KWD 3)."""
    entry = _currencies().get(code.upper())
    if entry is None:
        raise UnknownCurrencyError(f"'{code}' is not an ISO 4217 currency code")
    return int(entry["minor_units"])


def currency_name(code: str) -> str:
    return str(_currencies()[code.upper()]["name"])


def priceable_currencies() -> list[str]:
    """Codes a kitchen can choose (fund codes and accounting units excluded), sorted."""
    return sorted(c for c, e in _currencies().items() if not e.get("fund", False))


def _exponent(code: str) -> Decimal:
    return Decimal(1).scaleb(-minor_units(code))


@dataclass(frozen=True, order=True)
class Money:
    """An exact amount: `amount_minor` units of the currency's smallest unit."""

    amount_minor: int
    currency: str

    def __post_init__(self) -> None:
        if not is_currency(self.currency, allow_funds=True):
            raise UnknownCurrencyError(f"'{self.currency}' is not an ISO 4217 currency code")

    @classmethod
    def of(cls, amount: Decimal | int | str, currency: str) -> Money:
        """Exact conversion from a major-unit amount. Raises InexactAmountError instead of
        rounding (e.g. 7.995 USD, or 1500.50 RWF which has no decimals)."""
        code = currency.upper()
        try:
            value = Decimal(str(amount))
        except InvalidOperation as exc:
            raise ValueError(f"not an amount: {amount!r}") from exc
        if not value.is_finite():
            raise ValueError(f"not an amount: {amount!r}")
        scaled = value.scaleb(minor_units(code))
        if scaled != scaled.to_integral_value():
            raise InexactAmountError(
                f"{amount} has more decimals than {code} allows ({minor_units(code)})"
            )
        return cls(int(scaled), code)

    @classmethod
    def rounded(cls, amount: Decimal, currency: str) -> Money:
        """Round to the currency's smallest unit (ROUND_HALF_UP). Only for computed values
        such as totals or conversions, never for amounts a person typed or printed."""
        code = currency.upper()
        return cls(
            int(
                Decimal(amount)
                .quantize(_exponent(code), rounding=ROUND_HALF_UP)
                .scaleb(minor_units(code))
            ),
            code,
        )

    @property
    def amount(self) -> Decimal:
        """Major-unit decimal with exactly the currency's decimal places."""
        return (
            Decimal(self.amount_minor)
            .scaleb(-minor_units(self.currency))
            .quantize(_exponent(self.currency))
        )

    def to_api(self) -> dict[str, str]:
        """JSON form: decimal string, never a float."""
        return {"amount": str(self.amount), "currency": self.currency}

    def __add__(self, other: Money) -> Money:
        if not isinstance(other, Money) or other.currency != self.currency:
            raise ValueError("cannot add amounts in different currencies")
        return Money(self.amount_minor + other.amount_minor, self.currency)


# ── Price rounding steps (decision 7, 2026-11-19) ──────────────────────────────


def price_step(
    currency: str, overrides: dict[str, str] | None = None, kitchen_step: Decimal | None = None
) -> Decimal:
    """Step for suggested selling prices: the kitchen's own step, else the configured
    per-currency default, else the currency's smallest unit."""
    if kitchen_step is not None and kitchen_step > 0:
        return kitchen_step
    code = currency.upper()
    if overrides and code in overrides:
        step = Decimal(str(overrides[code]))
        if step > 0:
            return step
    return _exponent(code)


def round_up_to_step(value: Decimal, step: Decimal) -> Decimal:
    """Round a suggested price UP to the next multiple of `step` (0 stays 0)."""
    if value <= 0:
        return Decimal(0)
    return (value / step).to_integral_value(rounding=ROUND_CEILING) * step
