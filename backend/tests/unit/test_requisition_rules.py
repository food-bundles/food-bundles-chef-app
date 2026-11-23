"""Suggested requisition with the mockup numbers (spec screen 11): total 28,700 RWF."""

from __future__ import annotations

from datetime import date
from decimal import Decimal as D

from app.domain.requisition import average_portions, ceil_to_pack, same_weekdays, suggest

# Mockup p.11: (name, left, need, FB price per unit, pack) → (qty, line total)
MOCKUP = [
    ("Chicken", D("1.9"), D("5.9"), D("4500"), D("1"), D("4"), D("18000")),
    ("Cooking banana", D("8.4"), D("14"), D("400"), D("1"), D("6"), D("2400")),
    ("Rice", D("4.9"), D("7.6"), D("1500"), D("1"), D("3"), D("4500")),
    ("Carrots", D("0.1"), D("0.9"), D("800"), D("1"), D("1"), D("800")),
    ("Cooking oil", D("0.2"), D("0.7"), D("3000"), D("1"), D("1"), D("3000")),
]


def test_mockup_lines_and_total_28700() -> None:
    total = D("0")
    for _name, left, need, price, pack, qty, line_total in MOCKUP:
        s = suggest(need, D("0"), left, pack)
        assert s.qty == qty
        assert s.qty * price == line_total
        total += s.qty * price
    assert total == D("28700")


def test_rounds_up_to_the_pack_size() -> None:
    assert ceil_to_pack(D("2.7"), D("1")) == D("3")
    assert ceil_to_pack(D("2.7"), D("5")) == D("5")  # 5 kg bag
    assert ceil_to_pack(D("10"), D("5")) == D("10")
    assert ceil_to_pack(D("0"), D("5")) == D("0")
    assert ceil_to_pack(D("1.2"), D("0")) == D("2")  # pack 0 → 1


def test_enough_stock_suggests_nothing() -> None:
    assert suggest(D("3"), D("0"), D("5"), D("1")).qty == D("0")


def test_declined_shortage_is_added_and_buffer_and_yield_tune() -> None:
    # Chicken short 0.3 kg on a declined command is added to the need.
    assert suggest(D("5.6"), D("0.3"), D("1.9"), D("1")).need == D("5.9")
    # Buffer 10 % and yield 0.8 (config, default 0 % and 1).
    s = suggest(D("4"), D("0"), D("0"), D("1"), buffer_pct=D("0.1"), yield_fraction=D("0.8"))
    assert s.need == D("5.5")
    assert s.qty == D("6")


def test_average_on_the_last_7_same_weekdays_counts_open_days_only() -> None:
    target = date(2026, 11, 19)  # Thursday
    days = same_weekdays(target, 7)
    assert days[0] == date(2026, 11, 12)
    assert all(d.weekday() == target.weekday() for d in days)
    assert len(days) == 7
    portions = {days[0]: 20, days[1]: 10, days[3]: 0}
    assert average_portions(portions, days) == D("15")
    assert average_portions({}, days) == D("0")
