"""Deterministic parsing used by the AI gateway: the model only reads text; numbers are ours."""

from __future__ import annotations

from decimal import Decimal

import pytest
from app.domain.calculations import (
    convert_quantity,
    parse_quantity,
    parse_rwf_price,
    round_up_price,
    unit_price_from_total,
)


class TestParseRwfPrice:
    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ("3,500", 3500),
            ("3 500", 3500),
            ("3.500", 3500),
            ("3500/=", 3500),
            ("Frw 3500", 3500),
            ("3500 RWF", 3500),
            ("2.5k", 2500),
            ("2,5k", 2500),
            ("3k", 3000),
            ("1,200,000", 1_200_000),
        ],
    )
    def test_reads_rwanda_menu_formats(self, text: str, expected: int) -> None:
        assert parse_rwf_price(text) == expected

    @pytest.mark.parametrize("text", [None, "", "free", "3.50", "-200", "0", "abc 300 def"])
    def test_unreadable_or_ambiguous_is_none_never_guessed(self, text: str | None) -> None:
        assert parse_rwf_price(text) is None


class TestParseQuantity:
    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ("25", Decimal("25.000")),
            ("2.5", Decimal("2.500")),
            ("2,5", Decimal("2.500")),
            ("1/2", Decimal("0.500")),
            ("1 1/2", Decimal("1.500")),
            ("0.125", Decimal("0.125")),
        ],
    )
    def test_reads_written_quantities(self, text: str, expected: Decimal) -> None:
        assert parse_quantity(text) == expected

    @pytest.mark.parametrize("text", [None, "", "0", "abc", "1/0", "1,500", "-3"])
    def test_ambiguous_zero_or_unreadable_is_none(self, text: str | None) -> None:
        # "1,500" could be 1.5 or 1500 — the chef types it instead of us guessing.
        assert parse_quantity(text) is None


class TestUnitPriceFromTotal:
    def test_divides_line_total_by_quantity(self) -> None:
        assert unit_price_from_total(30_000, Decimal("50")) == 600

    def test_rounds_half_up_to_whole_rwf(self) -> None:
        assert unit_price_from_total(1000, Decimal("3")) == 333
        assert unit_price_from_total(1001, Decimal("2")) == 501  # 500.5 → 501

    @pytest.mark.parametrize(
        ("total", "qty"), [(None, Decimal("2")), (100, None), (100, Decimal("0"))]
    )
    def test_missing_or_zero_inputs_give_none(self, total: int | None, qty: Decimal | None) -> None:
        assert unit_price_from_total(total, qty) is None


class TestConvertQuantity:
    @pytest.mark.parametrize(
        ("qty", "src", "dst", "expected"),
        [
            ("250", "g", "kg", Decimal("0.25")),
            ("0.25", "kg", "g", Decimal("250")),
            ("500", "ml", "l", Decimal("0.5")),
            ("2", "Litres", "ml", Decimal("2000")),
            ("3", "pieces", "Pieces", Decimal("3")),
        ],
    )
    def test_same_family_units(self, qty: str, src: str, dst: str, expected: Decimal) -> None:
        assert convert_quantity(Decimal(qty), src, dst) == expected

    def test_incompatible_units_are_none(self) -> None:
        assert convert_quantity(Decimal("1"), "kg", "pieces") is None
        assert convert_quantity(Decimal("1"), "kg", "l") is None


class TestRoundUpPrice:
    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            (Decimal("1234"), 1300),
            (Decimal("1200"), 1200),
            (Decimal("0.01"), 100),
            (Decimal("0"), 0),
        ],
    )
    def test_rounds_up_to_next_hundred(self, value: Decimal, expected: int) -> None:
        assert round_up_price(value) == expected
