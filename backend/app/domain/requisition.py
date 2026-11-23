"""Suggested requisition (Food Bundles UX spec, screen 11; docs/domain-rules.md).

expected use (ingredient) = Σ over dishes(average portions on the last N same weekdays
                            × qty per portion) × (1 + buffer) ÷ yield
                            + quantity short on declined commands (added to the requisition)
suggested qty             = max(0, expected use − stock left), rounded UP to the pack size

Only days with portions count in the average (the kitchen was open); with none, the dish
adds nothing. Replaces the older 4-week 40/20/20/20 + 10 % buffer policy.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import ROUND_CEILING, Decimal

_ZERO = Decimal("0")


def same_weekdays(target: date, count: int) -> list[date]:
    """The `count` previous dates with the same weekday as `target` (most recent first)."""
    return [target - timedelta(weeks=i) for i in range(1, count + 1)]


def average_portions(portions_by_day: dict[date, int], days: list[date]) -> Decimal:
    """Average over the listed days that had portions; 0 when none did."""
    sold = [portions_by_day[d] for d in days if portions_by_day.get(d, 0) > 0]
    if not sold:
        return _ZERO
    return Decimal(sum(sold)) / Decimal(len(sold))


def ceil_to_pack(qty: Decimal, pack: Decimal) -> Decimal:
    """Round up to a whole number of packs (pack ≤ 0 is treated as 1)."""
    if qty <= _ZERO:
        return _ZERO
    size = pack if pack > _ZERO else Decimal("1")
    packs = (qty / size).to_integral_value(rounding=ROUND_CEILING)
    return packs * size


@dataclass(frozen=True)
class Suggestion:
    need: Decimal
    left: Decimal
    qty: Decimal


def suggest(
    expected_use: Decimal,
    declined_short: Decimal,
    left: Decimal,
    pack: Decimal,
    buffer_pct: Decimal = _ZERO,
    yield_fraction: Decimal = Decimal("1"),
    round_to_pack: bool = True,
) -> Suggestion:
    """One ingredient's line. `expected_use` is Σ(average portions × qty per portion)."""
    yld = yield_fraction if yield_fraction > _ZERO else Decimal("1")
    need = expected_use * (Decimal("1") + buffer_pct) / yld + declined_short
    missing = max(need - max(left, _ZERO), _ZERO)
    qty = ceil_to_pack(missing, pack) if round_to_pack else missing
    return Suggestion(need=need, left=left, qty=qty)
