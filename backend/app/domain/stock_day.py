"""Today's stock (Food Bundles UX spec, screen 10; docs/domain-rules.md). Deterministic.

Inventory entries hold the stock level AFTER each event. A day's row is read from the change
each entry made, by its type:
- In: deliveries (Receive, items bought elsewhere);
- Used: commands (and legacy sales) taking recipes out; a cancelled command putting them
  back reduces Used;
- Counted: physical counts and adjustments (waste, spoilage, error), as the difference.
Start is the level before the day's first entry; Left is the level after the last one, so
Start + In − Used + Counted = Left, and today's Left is tomorrow's Start.

Low stock: amber when Left < STOCK_LOW_FACTOR × one service's average use, red when Left <
STOCK_VERY_LOW_FACTOR × that use. One service's average use = the average of the daily Used
over the last days the ingredient was used (no history → no flag).
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

IN_TYPES = {"delivery"}
USED_TYPES = {"command_use", "command_return", "sale_use"}

_ZERO = Decimal("0")


@dataclass(frozen=True)
class StockDay:
    start: Decimal
    received: Decimal
    used: Decimal
    counted: Decimal
    left: Decimal


def stock_day(start: Decimal, entries: list[tuple[str, Decimal]]) -> StockDay:
    """`entries` = the day's (entry_type, level after) in time order."""
    level = start
    received = used = counted = _ZERO
    for entry_type, after in entries:
        delta = after - level
        if entry_type in IN_TYPES:
            received += delta
        elif entry_type in USED_TYPES:
            used -= delta  # a deduction lowers the level: Used grows
        else:
            counted += delta
        level = after
    return StockDay(start=start, received=received, used=used, counted=counted, left=level)


def average_service_use(daily_used: list[Decimal]) -> Decimal | None:
    """Average of the days with use; None when there is no history."""
    days = [d for d in daily_used if d > _ZERO]
    if not days:
        return None
    return sum(days, _ZERO) / len(days)


def low_level(
    left: Decimal, avg_use: Decimal | None, low_factor: Decimal, very_low_factor: Decimal
) -> str:
    """'very_low' (red), 'low' (amber) or 'ok'."""
    if avg_use is None or avg_use <= _ZERO:
        return "ok"
    if left < avg_use * very_low_factor:
        return "very_low"
    if left < avg_use * low_factor:
        return "low"
    return "ok"
