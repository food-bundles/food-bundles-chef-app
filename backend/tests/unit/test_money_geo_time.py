"""Step 2a build step 1: money, countries, time zones (no Rwanda special-casing)."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace

import pytest
from app.core.config import settings
from app.shared import geo, money
from app.shared.kitchen_time import kitchen_now, kitchen_today
from app.workers.tasks.daily_reminders import kitchens_due

D = Decimal


# ── currencies ────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("code", "units"),
    [
        ("RWF", 0),
        ("UGX", 0),
        ("JPY", 0),
        ("USD", 2),
        ("EUR", 2),
        ("KES", 2),
        ("NGN", 2),
        ("KWD", 3),
    ],
)
def test_minor_units_follow_iso_4217(code: str, units: int) -> None:
    assert money.minor_units(code) == units


def test_fund_codes_are_not_kitchen_currencies() -> None:
    assert money.is_currency("BOV", allow_funds=True)
    assert not money.is_currency("BOV")
    assert not money.is_currency("XYZ")
    assert "RWF" in money.priceable_currencies()
    assert "BOV" not in money.priceable_currencies()


def test_money_is_exact_or_refuses() -> None:
    assert money.Money.of("7.99", "USD") == money.Money(799, "USD")
    assert money.Money.of(1500, "RWF") == money.Money(1500, "RWF")
    assert money.Money.of("1.234", "KWD").amount_minor == 1234
    with pytest.raises(money.InexactAmountError):
        money.Money.of("1500.50", "RWF")  # RWF has no decimals: never rounded silently
    with pytest.raises(money.InexactAmountError):
        money.Money.of("7.995", "USD")


def test_money_api_form_is_a_decimal_string() -> None:
    assert money.Money(799, "USD").to_api() == {"amount": "7.99", "currency": "USD"}
    assert money.Money(3500, "RWF").to_api() == {"amount": "3500", "currency": "RWF"}


def test_rounding_only_for_computed_values() -> None:
    assert money.Money.rounded(D("7.995"), "USD") == money.Money(800, "USD")  # half up
    assert money.Money.rounded(D("1499.5"), "RWF") == money.Money(1500, "RWF")


def test_cannot_add_different_currencies() -> None:
    with pytest.raises(ValueError, match="different currencies"):
        _ = money.Money(100, "USD") + money.Money(100, "EUR")


def test_price_steps_per_currency() -> None:
    steps = settings.PRICE_ROUNDING_STEPS
    assert money.price_step("RWF", steps) == D("100")
    assert money.price_step("UGX", steps) == D("500")
    assert money.price_step("USD", steps) == D("0.50")
    assert money.price_step("GBP", steps) == D("0.01")  # not configured: smallest unit
    assert money.price_step("JPY", steps) == D("1")
    assert money.price_step("RWF", steps, kitchen_step=D("50")) == D("50")  # kitchen override
    assert money.round_up_to_step(D("1234"), D("100")) == D("1300")
    assert money.round_up_to_step(D("7.01"), D("0.50")) == D("7.50")


# ── countries and zones ───────────────────────────────────────────────────────


def test_countries_come_from_the_iana_table() -> None:
    assert geo.is_country("RW")
    assert geo.is_country("fr")
    assert not geo.is_country("ZZ")
    assert geo.country_timezones("NG")
    assert geo.is_timezone("Pacific/Auckland")
    assert not geo.is_timezone("Mars/Base")


# ── kitchen clocks across midnight ────────────────────────────────────────────

LATE_UTC = datetime(2026, 11, 18, 23, 30, tzinfo=UTC)


@pytest.mark.parametrize(
    ("zone", "day"),
    [
        ("Africa/Kigali", 19),  # UTC+2: already tomorrow
        ("America/Los_Angeles", 18),  # UTC-8: still today
        ("Pacific/Auckland", 19),  # UTC+13 (summer)
        ("UTC", 18),
    ],
)
def test_kitchen_today_uses_the_kitchen_zone(zone: str, day: int) -> None:
    assert kitchen_today(SimpleNamespace(timezone=zone), LATE_UTC).day == day


def test_unknown_zone_falls_back_to_utc() -> None:
    assert kitchen_now("Not/AZone", LATE_UTC).utcoffset().total_seconds() == 0  # type: ignore[union-attr]


def test_reminders_fire_at_local_seven_in_each_zone() -> None:
    kigali, paris, lima = (
        SimpleNamespace(timezone=z) for z in ("Africa/Kigali", "Europe/Paris", "America/Lima")
    )
    at_05 = datetime(2026, 11, 19, 5, 0, tzinfo=UTC)  # Kigali 07:00, Paris 06:00, Lima 00:00
    at_06 = datetime(2026, 11, 19, 6, 0, tzinfo=UTC)
    at_12 = datetime(2026, 11, 19, 12, 0, tzinfo=UTC)  # Lima 07:00
    assert kitchens_due([kigali, paris, lima], at_05, 7) == [kigali]
    assert kitchens_due([kigali, paris, lima], at_06, 7) == [paris]
    assert kitchens_due([kigali, paris, lima], at_12, 7) == [lima]
