"""The kitchen's own clock: every "today", daily total and scheduled job uses the kitchen's
time zone (decision 8, 2026-11-19). Nothing is pinned to Kigali or to the server's zone."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any, Protocol
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class HasTimezone(Protocol):
    """Anything with an IANA zone name (a Kitchen row: SQLAlchemy types it Mapped[str])."""

    timezone: Any


def kitchen_zone(kitchen: HasTimezone | str) -> ZoneInfo:
    """The kitchen's IANA zone; UTC if the stored name is unusable (logged by callers)."""
    name = kitchen if isinstance(kitchen, str) else str(kitchen.timezone)
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        return ZoneInfo("UTC")


def kitchen_now(kitchen: HasTimezone | str, now: datetime | None = None) -> datetime:
    """Current time in the kitchen's zone. `now` (aware) is for tests and batch jobs."""
    moment = now or datetime.now(UTC)
    if moment.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    return moment.astimezone(kitchen_zone(kitchen))


def kitchen_today(kitchen: HasTimezone | str, now: datetime | None = None) -> date:
    """The kitchen's local calendar day."""
    return kitchen_now(kitchen, now).date()
