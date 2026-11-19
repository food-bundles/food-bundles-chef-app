"""Countries (ISO 3166-1 alpha-2) and time zones, from the IANA tz database (tzdata).

No hand-typed country lists: the codes, names and each country's zones come from
iso3166.tab and zone1970.tab shipped with the tzdata package.
"""

from __future__ import annotations

import importlib.resources
from functools import lru_cache
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError, available_timezones


def _tab(name: str) -> list[list[str]]:
    text = (importlib.resources.files("tzdata") / "zoneinfo" / name).read_text(encoding="utf-8")
    return [line.split("\t") for line in text.splitlines() if line and not line.startswith("#")]


@lru_cache(maxsize=1)
def countries() -> dict[str, str]:
    """ISO 3166-1 alpha-2 code → English name."""
    return {row[0]: row[1] for row in _tab("iso3166.tab")}


@lru_cache(maxsize=1)
def _zones_by_country() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for row in _tab("zone1970.tab"):
        for code in row[0].split(","):
            out.setdefault(code, []).append(row[2])
    return out


def is_country(code: str | None) -> bool:
    return bool(code) and code.upper() in countries()  # type: ignore[union-attr]


def normalise_country(code: str) -> str:
    value = (code or "").strip().upper()
    if value not in countries():
        raise ValueError(f"'{code}' is not an ISO 3166-1 alpha-2 country code")
    return value


def country_timezones(code: str) -> list[str]:
    """IANA zones used in the country (first = the most populous region)."""
    return list(_zones_by_country().get(code.upper(), []))


@lru_cache(maxsize=1)
def _zones() -> frozenset[str]:
    return frozenset(available_timezones())


def is_timezone(name: str | None) -> bool:
    if not name or name not in _zones():
        return False
    try:
        ZoneInfo(name)
    except ZoneInfoNotFoundError:
        return False
    return True
