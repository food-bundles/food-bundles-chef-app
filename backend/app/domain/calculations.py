"""Deterministic kitchen domain calculations.

All arithmetic uses Decimal. No floats, no AI, no randomness.
Formula sources are cited so mobile can stay aligned.

Key formulas (from INTEGRATION_DESIGN.md § Business Formulas):

  weighted_demand(w0..w3, portions0..3) = Σ wi * portionsi
    weights: (0.40, 0.20, 0.20, 0.20) — latest week first

  expected_daily_use = weekly_sales / days_open * qty_per_portion / yield_fraction

  purchase_qty (raw) = expected_portions * qty_per_portion / yield_fraction
                       * (1 + safety_buffer) − current_stock
  purchase_qty (rounded) = ceil(raw / selling_unit_size) * selling_unit_size

  days_cover = current_stock / expected_daily_use

  opening_stock = prev_closing + accepted_deliveries − expected_use
"""
from __future__ import annotations

import math
from collections.abc import Sequence
from decimal import ROUND_HALF_UP, Decimal

from app.core.constants import (
    DEMAND_WEIGHTS,
    LOW_STOCK_DAYS_THRESHOLD,
    SAFETY_BUFFER_FRACTION,
    TARGET_DAYS_COVER,
)

_ZERO = Decimal("0")
_ONE = Decimal("1")


# ── Weighted demand ────────────────────────────────────────────────────────────

def weighted_demand(
    weekly_portions: Sequence[Decimal],
    weights: Sequence[Decimal] | None = None,
) -> Decimal:
    """Weighted average portions across up to 4 weeks.

    weekly_portions[0] is the most recent week (weight 0.40).
    Fewer than 4 weeks: weights are re-normalised to sum to 1.

    Args:
        weekly_portions: 1–4 weekly portion counts, most recent first.
        weights: explicit weights (default: DEMAND_WEIGHTS). Must be ≥ len(weekly_portions).

    Returns:
        Weighted demand as Decimal, rounded to 4 dp.
    """
    if not weekly_portions:
        return _ZERO

    w_seq = [Decimal(str(w)) for w in (weights or DEMAND_WEIGHTS)[: len(weekly_portions)]]
    total_weight = sum(w_seq)
    if total_weight == _ZERO:
        return _ZERO

    result = sum(
        Decimal(str(p)) * w for p, w in zip(weekly_portions, w_seq, strict=False)
    ) / total_weight
    return result.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


# ── Daily use ──────────────────────────────────────────────────────────────────

def expected_daily_use(
    weekly_sales: Decimal,
    days_open: int,
    qty_per_portion: Decimal,
    yield_fraction: Decimal,
) -> Decimal:
    """Raw ingredient needed per day (in ingredient unit).

    = weekly_sales / days_open * qty_per_portion / yield_fraction

    Args:
        weekly_sales: expected portions sold per week.
        days_open: days/week the kitchen operates (1–7).
        qty_per_portion: ingredient quantity needed per menu portion (raw, before yield).
        yield_fraction: usable fraction after prep (0 < x ≤ 1).

    Returns:
        Expected daily ingredient use, rounded to 4 dp.

    Raises:
        ValueError: if days_open < 1 or yield_fraction ≤ 0.
    """
    if days_open < 1:
        raise ValueError(f"days_open must be ≥ 1, got {days_open}")
    if yield_fraction <= _ZERO:
        raise ValueError(f"yield_fraction must be > 0, got {yield_fraction}")

    result = weekly_sales / Decimal(days_open) * qty_per_portion / yield_fraction
    return result.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


# ── Purchase quantity ──────────────────────────────────────────────────────────

def purchase_quantity(
    expected_portions: Decimal,
    qty_per_portion: Decimal,
    yield_fraction: Decimal,
    current_stock: Decimal,
    selling_unit_size: Decimal,
    safety_buffer_fraction: Decimal | None = None,
) -> Decimal:
    """How much to order (in supplier selling units).

    raw = expected_portions * qty_per_portion / yield_fraction
          * (1 + safety_buffer) − current_stock
    order = ceil(max(raw, 0) / selling_unit_size) * selling_unit_size

    Args:
        expected_portions: weighted demand portions for the purchase period.
        qty_per_portion: ingredient quantity per menu portion (raw, in ingredient unit).
        yield_fraction: usable fraction after prep (0 < x ≤ 1).
        current_stock: stock on hand right now (ingredient unit).
        selling_unit_size: supplier minimum order multiple (ingredient unit).
        safety_buffer_fraction: override (default: SAFETY_BUFFER_FRACTION = 0.10).

    Returns:
        Quantity to order, rounded up to nearest selling_unit_size.
    """
    if yield_fraction <= _ZERO:
        raise ValueError(f"yield_fraction must be > 0, got {yield_fraction}")
    if selling_unit_size <= _ZERO:
        raise ValueError(f"selling_unit_size must be > 0, got {selling_unit_size}")

    buffer = Decimal(str(safety_buffer_fraction if safety_buffer_fraction is not None else SAFETY_BUFFER_FRACTION))
    gross_need = expected_portions * qty_per_portion / yield_fraction * (_ONE + buffer)
    raw = gross_need - current_stock

    if raw <= _ZERO:
        return _ZERO

    # Ceiling division in Decimal
    units = math.ceil(float(raw / selling_unit_size))
    return Decimal(units) * selling_unit_size


# ── Days cover ─────────────────────────────────────────────────────────────────

def days_cover(
    current_stock: Decimal,
    daily_use: Decimal,
) -> Decimal | None:
    """How many days of stock remain.

    Returns None if daily_use is zero (ingredient not used daily).
    Returns Decimal rounded to 2 dp otherwise.
    """
    if daily_use <= _ZERO:
        return None
    result = current_stock / daily_use
    return result.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def is_low_stock(cover: Decimal | None) -> bool:
    """True when days cover < LOW_STOCK_DAYS_THRESHOLD (default 1.0)."""
    if cover is None:
        return False
    return cover < Decimal(str(LOW_STOCK_DAYS_THRESHOLD))


# ── Opening stock ──────────────────────────────────────────────────────────────

def opening_stock(
    prev_closing_stock: Decimal,
    accepted_deliveries: Decimal,
    expected_use: Decimal,
) -> Decimal:
    """Opening stock for a period.

    = prev_closing + accepted_deliveries − expected_use
    Clamped to 0 (stock cannot go negative).
    """
    result = prev_closing_stock + accepted_deliveries - expected_use
    return max(result, _ZERO)


# ── Recipe cost ────────────────────────────────────────────────────────────────

def recipe_cost(
    lines: Sequence[tuple[Decimal, Decimal, Decimal]],
) -> Decimal:
    """Total raw ingredient cost for one portion of a recipe.

    Args:
        lines: sequence of (qty_per_portion, yield_fraction, cost_per_unit).
               cost_per_unit is in kitchen currency per ingredient unit.

    Returns:
        Total cost rounded to 2 dp.
    """
    total = sum(
        qty / yld * cost
        for qty, yld, cost in lines
        if yld > _ZERO
    )
    return Decimal(str(total)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# ── Suggested purchase period ──────────────────────────────────────────────────

def target_order_qty(
    expected_portions: Decimal,
    qty_per_portion: Decimal,
    yield_fraction: Decimal,
    current_stock: Decimal,
    selling_unit_size: Decimal,
    days_cover_target: int = TARGET_DAYS_COVER,
    days_open: int = 7,
    safety_buffer_fraction: Decimal | None = None,
) -> Decimal:
    """Order enough to reach TARGET_DAYS_COVER days of stock.

    Scales expected_portions to the target cover window.
    """
    if days_open < 1:
        raise ValueError(f"days_open must be ≥ 1, got {days_open}")
    # Scale weekly demand to the target window
    daily = expected_portions / Decimal(days_open)
    target_portions = daily * Decimal(days_cover_target)
    return purchase_quantity(
        expected_portions=target_portions,
        qty_per_portion=qty_per_portion,
        yield_fraction=yield_fraction,
        current_stock=current_stock,
        selling_unit_size=selling_unit_size,
        safety_buffer_fraction=safety_buffer_fraction,
    )
