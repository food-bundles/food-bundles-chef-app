"""Commands (Food Bundles UX spec, screens 05–08; docs/domain-rules.md). Deterministic rules.

- Status: New → Cooking → Served (Dine-in) or Handed (To go); New → Declined;
  Cooking → Cancelled. Every other transition is rejected.
- Can make (dish) = min over its ingredients of floor(stock left ÷ qty per portion).
- Stock check of a command: per ingredient, need = Σ portions × qty per portion; the command
  is short when need > have. "Accept X of Y" = the most portions the stock can cover.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_FLOOR, Decimal

NEW = "new"
COOKING = "cooking"
SERVED = "served"
HANDED = "handed"
DECLINED = "declined"
CANCELLED = "cancelled"

DINE_IN = "dine_in"
TO_GO = "to_go"

_ALLOWED: dict[str, set[str]] = {
    NEW: {COOKING, DECLINED},
    COOKING: {SERVED, HANDED, CANCELLED},
}

_ZERO = Decimal("0")


def can_transition(current: str, target: str, command_type: str) -> bool:
    """Only the spec's transitions; Served is for Dine-in, Handed for To go."""
    if target not in _ALLOWED.get(current, set()):
        return False
    if target == SERVED and command_type != DINE_IN:
        return False
    return not (target == HANDED and command_type != TO_GO)


def done_status(command_type: str) -> str:
    """The final status when the food leaves the kitchen."""
    return HANDED if command_type == TO_GO else SERVED


def initial_status(role: str, new_status_roles: list[str], source: str = "app") -> str:
    """Recorded by a role in `new_status_roles` (waiter, cashier) or sent by the restaurant:
    New, waiting for the chef's stock check. Recorded by the chef: straight to Cooking."""
    if source == "restaurant" or role in new_status_roles:
        return NEW
    return COOKING


@dataclass(frozen=True)
class RecipeNeed:
    """One ingredient of a dish: quantity per portion in the ingredient's stock unit."""

    ingredient_id: str
    name: str
    unit: str
    qty_per_portion: Decimal


def can_make(recipe: list[RecipeNeed], stock: dict[str, Decimal]) -> int | None:
    """How many portions the stock covers; None for a dish without a recipe (no limit known).
    Ingredients with a zero quantity are ignored."""
    counts = [
        int((max(stock.get(r.ingredient_id, _ZERO), _ZERO) / r.qty_per_portion).to_integral_value(ROUND_FLOOR))
        for r in recipe
        if r.qty_per_portion > _ZERO
    ]
    return min(counts) if counts else None


@dataclass(frozen=True)
class Missing:
    ingredient_id: str
    name: str
    unit: str
    need: Decimal
    have: Decimal

    @property
    def short(self) -> Decimal:
        return self.need - self.have


@dataclass(frozen=True)
class StockCheck:
    enough: bool
    missing: list[Missing]
    #: The most portions of the command that can be cooked ("Accept X of Y").
    max_portions: int
    total_portions: int


def stock_check(
    lines: list[tuple[int, list[RecipeNeed]]], stock: dict[str, Decimal]
) -> StockCheck:
    """`lines` = [(portions, recipe of that dish)]. Shortages are summed per ingredient."""
    need: dict[str, Decimal] = {}
    meta: dict[str, RecipeNeed] = {}
    for portions, recipe in lines:
        for r in recipe:
            need[r.ingredient_id] = need.get(r.ingredient_id, _ZERO) + r.qty_per_portion * portions
            meta.setdefault(r.ingredient_id, r)
    missing = [
        Missing(iid, meta[iid].name, meta[iid].unit, qty, max(stock.get(iid, _ZERO), _ZERO))
        for iid, qty in need.items()
        if qty > max(stock.get(iid, _ZERO), _ZERO)
    ]
    total = sum(p for p, _ in lines)
    return StockCheck(
        enough=not missing,
        missing=missing,
        max_portions=total if not missing else _max_portions(lines, stock),
        total_portions=total,
    )


def _max_portions(lines: list[tuple[int, list[RecipeNeed]]], stock: dict[str, Decimal]) -> int:
    """Greedy: take portions line by line while every ingredient still covers them."""
    left = {k: max(v, _ZERO) for k, v in stock.items()}
    taken = 0
    for portions, recipe in lines:
        for _ in range(portions):
            if all(left.get(r.ingredient_id, _ZERO) >= r.qty_per_portion for r in recipe):
                for r in recipe:
                    left[r.ingredient_id] = left.get(r.ingredient_id, _ZERO) - r.qty_per_portion
                taken += 1
            else:
                break
    return taken


def decline_message(missing: list[Missing]) -> str:
    """The restaurant's message: "Declined – not enough Chicken (short 0.3 kg)."."""
    parts = [f"{m.name} (short {_fmt(m.short)} {m.unit})" for m in missing]
    return "Declined – not enough " + ", ".join(parts) + "."


def _fmt(value: Decimal) -> str:
    text = f"{value.quantize(Decimal('0.01')):f}".rstrip("0").rstrip(".")
    return text or "0"
