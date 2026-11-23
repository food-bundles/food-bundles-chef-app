"""Writing money onto rows: one place that sets the legacy decimal, the exact minor units and
the currency together (dual-write for one release), and that refuses inexact amounts.

Step 2a build steps 2-3. Prices people pay or charge (menu prices, order lines) must be in
the kitchen's currency; other currencies are refused instead of being mixed into revenue.
Ingredient costs may be in any currency: food cost converts them at the table's rate.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Protocol

from app.core.exceptions import (
    AmountPrecisionError,
    ConversionDisabledError,
    OtherCurrencyNotSupportedError,
    UnknownCurrencyCodeError,
)
from app.shared.money import (
    InexactAmountError,
    Money,
    UnknownCurrencyError,
    minor_units,
    normalise_currency,
)

# Decimal places kept for unit costs (Numeric(18, 6)): a cost per gram can be a fraction
# of the smallest coin.
UNIT_COST_DECIMALS = 6


class HasCurrency(Protocol):
    currency: Any


def resolve_currency(kitchen: HasCurrency, requested: str | None) -> str:
    """The currency of a new amount: the one sent, else the kitchen's.

    Only the kitchen's currency is accepted for selling prices and order lines.
    """
    kitchen_currency = str(kitchen.currency)
    if requested is None:
        return kitchen_currency
    code = known_currency(requested)
    if code != kitchen_currency:
        raise OtherCurrencyNotSupportedError()
    return code


def resolve_cost_currency(
    kitchen: HasCurrency, requested: str | None, current: str | None = None
) -> str:
    """The currency of an ingredient cost: any priceable ISO 4217 code, else the kitchen's.

    The original amount and currency are kept; food cost converts (decision 4, 2026-11-19).
    """
    if requested is None:
        return str(kitchen.currency)
    code = known_currency(requested)
    foreign = code != str(kitchen.currency) and code != current
    if foreign and not getattr(kitchen, "conversion_enabled", True):
        # A NEW foreign-currency cost needs conversion for food cost: off in this country.
        # A cost already stored in that currency may keep it.
        raise ConversionDisabledError()
    return code


def known_currency(code: str) -> str:
    try:
        return normalise_currency(code)
    except UnknownCurrencyError:
        raise UnknownCurrencyCodeError() from None


def exact_money(amount: Decimal, currency: str) -> Money:
    """Money for an amount a person typed or printed: never rounded."""
    try:
        return Money.of(amount, currency)
    except InexactAmountError:
        raise AmountPrecisionError(
            f"{amount} has more decimals than {currency} allows ({minor_units(currency)})."
        ) from None


def set_price(row: Any, field: str, amount: Decimal | None, currency: str) -> None:
    """Set `<field>`, `<field>_minor` and `<field>_currency` on a row together."""
    if amount is None:
        setattr(row, field, None)
        setattr(row, f"{field}_minor", None)
        setattr(row, f"{field}_currency", None)
        return
    money = exact_money(amount, currency)
    setattr(row, field, money.amount)
    setattr(row, f"{field}_minor", money.amount_minor)
    setattr(row, f"{field}_currency", money.currency)


def check_unit_cost(amount: Decimal | None) -> Decimal | None:
    """Unit costs keep up to 6 decimals; more would be rounded by the column, so refuse."""
    if amount is None:
        return None
    exponent = amount.as_tuple().exponent
    if isinstance(exponent, int) and -exponent > UNIT_COST_DECIMALS:
        raise AmountPrecisionError(
            f"{amount}: unit costs keep at most {UNIT_COST_DECIMALS} decimal places."
        )
    return amount


# ── Migration pre-check (pure, unit-tested) ────────────────────────────────────


@dataclass(frozen=True)
class AmountRow:
    table: str
    row_id: str
    amount: Decimal
    currency: str


def find_inexact_amounts(rows: Iterable[AmountRow]) -> list[AmountRow]:
    """Rows whose amount has more decimals than their currency allows (e.g. 1500.50 RWF).

    The money migration stops when this is not empty: converting them would round silently.
    """
    bad: list[AmountRow] = []
    for row in rows:
        try:
            Money.of(row.amount, row.currency)
        except InexactAmountError:
            bad.append(row)
    return bad
