"""Today's stock with the mockup numbers (spec screen 10)."""

from __future__ import annotations

from decimal import Decimal as D

from app.domain.stock_day import average_service_use, low_level, stock_day


def test_chicken_1_0_plus_5_0_minus_4_1_is_1_9() -> None:
    # Start 1.0; Receive +5.0 → 6.0; commands take 2.5, 1.2 and 0.4 → 1.9.
    sd = stock_day(
        D("1.0"),
        [("delivery", D("6.0")), ("command_use", D("3.5")), ("command_use", D("2.3")), ("command_use", D("1.9"))],
    )
    assert (sd.start, sd.received, sd.used, sd.counted, sd.left) == (
        D("1.0"),
        D("5.0"),
        D("4.1"),
        D("0"),
        D("1.9"),
    )


def test_cancel_puts_back_and_count_is_the_difference() -> None:
    sd = stock_day(
        D("2.0"),
        [("command_use", D("1.4")), ("command_return", D("1.7")), ("count", D("1.5"))],
    )
    assert sd.used == D("0.3")
    assert sd.counted == D("-0.2")
    assert sd.left == D("1.5")
    assert sd.start + sd.received - sd.used + sd.counted == sd.left


def test_no_entries_today_left_is_start() -> None:
    sd = stock_day(D("0.3"), [])
    assert sd.left == D("0.3")


def test_low_and_very_low() -> None:
    # Amber below one service's use, red below half of it.
    assert low_level(D("1.9"), D("3.5"), D("1"), D("0.5")) == "low"
    assert low_level(D("0.2"), D("0.5"), D("1"), D("0.5")) == "very_low"
    assert low_level(D("8.4"), D("3.6"), D("1"), D("0.5")) == "ok"
    assert low_level(D("0"), None, D("1"), D("0.5")) == "ok"


def test_average_service_use_ignores_days_without_use() -> None:
    assert average_service_use([D("4"), D("0"), D("2")]) == D("3")
    assert average_service_use([]) is None
