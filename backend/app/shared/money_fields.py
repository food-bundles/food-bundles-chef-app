"""Writing money onto rows: one place that sets the legacy decimal, the exact minor units and
the currency together (dual-write for one release), and that refuses inexact amounts.

Step 2a build step 2. Until conversion exists (step 3), amounts must be in the kitchen's
currency; other currencies are refused instead of being mixed into food cost and revenue.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Protocol

from app.core.exceptions import AmountPrecisionError, OtherCurrencyNotSupportedError
from app.shared.money import InexactAmountError, Money, minor_units, normalise_currency

# Decimal places kept for unit costs (Numeric(18, 6)): a cost per gram can be a fraction
# of the smallest coin.
UNIT_COST_DECIMALS = 6


class HasCurrency(Protocol):
    currency: Any


def resolve_currency(kitchen: HasCurrency, requested: str | None) -> str:
    """The currency of a new amount: the one sent, else the kitchen's.

    For now only the kitchen's currency is accepted (conversion arrives with exchange rates).
    """
    kitchen_currency = str(kitchen.currency)
    if requested is None:
        return kitchen_currency
    code = normalise_currency(requested)
    if code != kitchen_currency:
        raise OtherCurrencyNotSupportedError()
    return code


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
