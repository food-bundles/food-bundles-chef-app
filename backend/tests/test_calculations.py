"""Unit tests for deterministic kitchen domain calculations.

Every test verifies the formula hand-calculation, boundary condition,
or edge case documented in INTEGRATION_DESIGN.md § Business Formulas.
All values computed manually before asserting.
"""
from __future__ import annotations

from decimal import Decimal

import pytest

from app.domain.calculations import (
    days_cover,
    expected_daily_use,
    is_low_stock,
    opening_stock,
    purchase_quantity,
    recipe_cost,
    target_order_qty,
    weighted_demand,
)


# ── weighted_demand ────────────────────────────────────────────────────────────

class TestWeightedDemand:
    def test_four_weeks_standard_weights(self) -> None:
        # week0=100, week1=80, week2=60, week3=40
        # = 0.40*100 + 0.20*80 + 0.20*60 + 0.20*40
        # = 40 + 16 + 12 + 8 = 76.0000
        result = weighted_demand([Decimal("100"), Decimal("80"), Decimal("60"), Decimal("40")])
        assert result == Decimal("76.0000")

    def test_single_week_returns_that_value(self) -> None:
        result = weighted_demand([Decimal("50")])
        assert result == Decimal("50.0000")

    def test_two_weeks_renormalises(self) -> None:
        # weights slice = (0.40, 0.20), total = 0.60
        # = (0.40*100 + 0.20*80) / 0.60 = (40+16)/0.60 = 56/0.60 = 93.3333...
        result = weighted_demand([Decimal("100"), Decimal("80")])
        assert result == Decimal("93.3333")

    def test_empty_returns_zero(self) -> None:
        assert weighted_demand([]) == Decimal("0")

    def test_custom_weights(self) -> None:
        # equal weights: (0.5, 0.5)
        result = weighted_demand(
            [Decimal("100"), Decimal("50")],
            weights=[Decimal("0.5"), Decimal("0.5")],
        )
        assert result == Decimal("75.0000")


# ── expected_daily_use ─────────────────────────────────────────────────────────

class TestExpectedDailyUse:
    def test_basic_calculation(self) -> None:
        # weekly_sales=70, days_open=7, qty_per_portion=0.5 kg, yield=0.8
        # = 70/7 * 0.5 / 0.8 = 10 * 0.625 = 6.25 kg/day
        result = expected_daily_use(
            weekly_sales=Decimal("70"),
            days_open=7,
            qty_per_portion=Decimal("0.5"),
            yield_fraction=Decimal("0.8"),
        )
        assert result == Decimal("6.2500")

    def test_5_days_open(self) -> None:
        # weekly_sales=50, days_open=5, qty=0.3, yield=1.0
        # = 50/5 * 0.3 / 1.0 = 10 * 0.3 = 3.0000
        result = expected_daily_use(
            weekly_sales=Decimal("50"),
            days_open=5,
            qty_per_portion=Decimal("0.3"),
            yield_fraction=Decimal("1.0"),
        )
        assert result == Decimal("3.0000")

    def test_raises_on_zero_days(self) -> None:
        with pytest.raises(ValueError, match="days_open"):
            expected_daily_use(Decimal("50"), 0, Decimal("0.3"), Decimal("1.0"))

    def test_raises_on_zero_yield(self) -> None:
        with pytest.raises(ValueError, match="yield_fraction"):
            expected_daily_use(Decimal("50"), 7, Decimal("0.3"), Decimal("0"))


# ── purchase_quantity ──────────────────────────────────────────────────────────

class TestPurchaseQuantity:
    def test_basic_order(self) -> None:
        # portions=100, qty=0.5, yield=0.8, stock=10, unit=5, buffer=0.10
        # gross = 100 * 0.5 / 0.8 * 1.10 = 62.5 * 1.10 = 68.75
        # raw = 68.75 - 10 = 58.75
        # ceil(58.75 / 5) * 5 = ceil(11.75) * 5 = 12 * 5 = 60
        result = purchase_quantity(
            expected_portions=Decimal("100"),
            qty_per_portion=Decimal("0.5"),
            yield_fraction=Decimal("0.8"),
            current_stock=Decimal("10"),
            selling_unit_size=Decimal("5"),
        )
        assert result == Decimal("60")

    def test_enough_stock_returns_zero(self) -> None:
        # portions=10, qty=0.5, yield=1.0, buffer=0.10, stock=100, unit=1
        # gross = 10 * 0.5 / 1.0 * 1.10 = 5.5
        # raw = 5.5 - 100 = -94.5 → 0
        result = purchase_quantity(
            expected_portions=Decimal("10"),
            qty_per_portion=Decimal("0.5"),
            yield_fraction=Decimal("1.0"),
            current_stock=Decimal("100"),
            selling_unit_size=Decimal("1"),
        )
        assert result == Decimal("0")

    def test_rounds_up_to_selling_unit(self) -> None:
        # raw=1.1 kg, selling_unit=5 kg → order 5
        result = purchase_quantity(
            expected_portions=Decimal("10"),
            qty_per_portion=Decimal("1"),
            yield_fraction=Decimal("1.0"),
            current_stock=Decimal("9.9"),  # raw ≈ 11 - 9.9 = 1.1
            selling_unit_size=Decimal("5"),
            safety_buffer_fraction=Decimal("0"),
        )
        assert result == Decimal("5")

    def test_custom_safety_buffer(self) -> None:
        # portions=100, qty=1.0, yield=1.0, stock=0, unit=1, buffer=0.20
        # gross = 100 * 1.0 / 1.0 * 1.20 = 120
        # ceil(120 / 1) = 120
        result = purchase_quantity(
            expected_portions=Decimal("100"),
            qty_per_portion=Decimal("1.0"),
            yield_fraction=Decimal("1.0"),
            current_stock=Decimal("0"),
            selling_unit_size=Decimal("1"),
            safety_buffer_fraction=Decimal("0.20"),
        )
        assert result == Decimal("120")

    def test_raises_on_zero_yield(self) -> None:
        with pytest.raises(ValueError, match="yield_fraction"):
            purchase_quantity(Decimal("10"), Decimal("1"), Decimal("0"), Decimal("0"), Decimal("1"))

    def test_raises_on_zero_selling_unit(self) -> None:
        with pytest.raises(ValueError, match="selling_unit_size"):
            purchase_quantity(Decimal("10"), Decimal("1"), Decimal("1"), Decimal("0"), Decimal("0"))


# ── days_cover ─────────────────────────────────────────────────────────────────

class TestDaysCover:
    def test_normal_case(self) -> None:
        # stock=50, daily=10 → 5.00 days
        result = days_cover(Decimal("50"), Decimal("10"))
        assert result == Decimal("5.00")

    def test_fractional_result(self) -> None:
        # 7 / 3 = 2.33...
        result = days_cover(Decimal("7"), Decimal("3"))
        assert result == Decimal("2.33")

    def test_zero_daily_use_returns_none(self) -> None:
        assert days_cover(Decimal("50"), Decimal("0")) is None

    def test_zero_stock(self) -> None:
        result = days_cover(Decimal("0"), Decimal("5"))
        assert result == Decimal("0.00")


# ── is_low_stock ───────────────────────────────────────────────────────────────

class TestIsLowStock:
    def test_under_threshold(self) -> None:
        assert is_low_stock(Decimal("0.5")) is True

    def test_at_threshold(self) -> None:
        # < 1.0 day is low; exactly 1.0 is NOT low
        assert is_low_stock(Decimal("1.0")) is False

    def test_above_threshold(self) -> None:
        assert is_low_stock(Decimal("3.0")) is False

    def test_none_is_not_low(self) -> None:
        assert is_low_stock(None) is False


# ── opening_stock ──────────────────────────────────────────────────────────────

class TestOpeningStock:
    def test_normal_case(self) -> None:
        # prev=20, deliveries=30, expected_use=15 → 35
        result = opening_stock(Decimal("20"), Decimal("30"), Decimal("15"))
        assert result == Decimal("35")

    def test_clamped_to_zero(self) -> None:
        # prev=5, deliveries=0, expected_use=10 → -5 → 0
        result = opening_stock(Decimal("5"), Decimal("0"), Decimal("10"))
        assert result == Decimal("0")

    def test_zero_deliveries(self) -> None:
        result = opening_stock(Decimal("10"), Decimal("0"), Decimal("3"))
        assert result == Decimal("7")


# ── recipe_cost ────────────────────────────────────────────────────────────────

class TestRecipeCost:
    def test_single_ingredient(self) -> None:
        # qty=0.5, yield=0.8, cost_per_unit=1000 RWF
        # line = 0.5 / 0.8 * 1000 = 625.00
        lines = [(Decimal("0.5"), Decimal("0.8"), Decimal("1000"))]
        assert recipe_cost(lines) == Decimal("625.00")

    def test_multiple_ingredients(self) -> None:
        lines = [
            (Decimal("0.5"), Decimal("1.0"), Decimal("2000")),   # 1000.00
            (Decimal("0.2"), Decimal("0.8"), Decimal("500")),    # 125.00
        ]
        # total = 1125.00
        assert recipe_cost(lines) == Decimal("1125.00")

    def test_empty_lines(self) -> None:
        assert recipe_cost([]) == Decimal("0.00")

    def test_skips_zero_yield(self) -> None:
        lines = [
            (Decimal("1.0"), Decimal("0"), Decimal("1000")),  # skip
            (Decimal("0.5"), Decimal("1.0"), Decimal("500")),  # 250.00
        ]
        assert recipe_cost(lines) == Decimal("250.00")


# ── target_order_qty ───────────────────────────────────────────────────────────

class TestTargetOrderQty:
    def test_3_day_target(self) -> None:
        # weekly demand=70, days_open=7 → daily=10, target_portions=30
        # gross = 30 * 0.5 / 0.8 * 1.10 = 20.625
        # ceil(20.625 / 5) * 5 = ceil(4.125) * 5 = 5 * 5 = 25
        result = target_order_qty(
            expected_portions=Decimal("70"),
            qty_per_portion=Decimal("0.5"),
            yield_fraction=Decimal("0.8"),
            current_stock=Decimal("0"),
            selling_unit_size=Decimal("5"),
            days_cover_target=3,
            days_open=7,
        )
        assert result == Decimal("25")

    def test_raises_on_zero_days_open(self) -> None:
        with pytest.raises(ValueError):
            target_order_qty(
                Decimal("70"), Decimal("0.5"), Decimal("0.8"),
                Decimal("0"), Decimal("5"), days_open=0,
            )
