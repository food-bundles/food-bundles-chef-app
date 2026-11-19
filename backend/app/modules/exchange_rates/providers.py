"""Exchange-rate provider clients: ExchangeRate-API (primary, paid plan) and Frankfurter.

Each returns USD-based rates as a `RateFetch`. Parsing is pure (unit-tested with recorded
payloads). The HTTP functions never put the request URL in errors or logs, because the
ExchangeRate-API URL contains the key.
"""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx

from app.core.config import settings
from app.shared.money import is_currency

BASE_CURRENCY = "USD"
SOURCE_EXCHANGERATE_API = "exchangerate_api"
SOURCE_FRANKFURTER = "frankfurter"
# When both sources have a rate for the same day, the first one wins.
SOURCE_PRIORITY: tuple[str, ...] = (SOURCE_EXCHANGERATE_API, SOURCE_FRANKFURTER)


class RateProviderError(Exception):
    """A provider failed. `reason` is safe to log (no URL, no key)."""

    def __init__(self, source: str, reason: str) -> None:
        self.source = source
        self.reason = reason
        super().__init__(f"{source}: {reason}")


@dataclass(frozen=True)
class FetchedRate:
    quote: str
    rate: Decimal
    rate_date: date
    provider_timestamp: datetime | None = None


@dataclass(frozen=True)
class RateFetch:
    source: str
    base: str
    rates: list[FetchedRate] = field(default_factory=list)


def _decimal_rate(value: Any) -> Decimal | None:
    if isinstance(value, bool):
        return None
    try:
        rate = value if isinstance(value, Decimal) else Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None
    if not rate.is_finite() or rate <= 0:
        return None
    return rate


def _keep(quote: Any, base: str) -> bool:
    return isinstance(quote, str) and quote.upper() != base and is_currency(quote)


def parse_exchangerate_api(payload: Any) -> RateFetch:
    """`GET {url}/{key}/latest/USD` → RateFetch. Raises RateProviderError on an error body."""
    source = SOURCE_EXCHANGERATE_API
    if not isinstance(payload, dict):
        raise RateProviderError(source, "unexpected_body")
    if payload.get("result") != "success":
        raise RateProviderError(source, str(payload.get("error-type") or "error"))
    if str(payload.get("base_code", "")).upper() != BASE_CURRENCY:
        raise RateProviderError(source, "unexpected_base")
    try:
        stamp = datetime.fromtimestamp(int(payload["time_last_update_unix"]), tz=UTC)
    except (KeyError, TypeError, ValueError):
        raise RateProviderError(source, "missing_timestamp") from None
    rates: list[FetchedRate] = []
    for quote, value in (payload.get("conversion_rates") or {}).items():
        rate = _decimal_rate(value)
        if rate is not None and _keep(quote, BASE_CURRENCY):
            rates.append(FetchedRate(quote.upper(), rate, stamp.date(), stamp))
    if not rates:
        raise RateProviderError(source, "no_rates")
    return RateFetch(source, BASE_CURRENCY, rates)


def parse_frankfurter(payload: Any) -> RateFetch:
    """`GET {url}/rates?base=USD` → list of {date, base, quote, rate}; each pair has its date."""
    source = SOURCE_FRANKFURTER
    if not isinstance(payload, list):
        raise RateProviderError(source, "unexpected_body")
    rates: list[FetchedRate] = []
    for entry in payload:
        if not isinstance(entry, dict) or str(entry.get("base", "")).upper() != BASE_CURRENCY:
            continue
        rate = _decimal_rate(entry.get("rate"))
        quote = entry.get("quote")
        try:
            rate_date = date.fromisoformat(str(entry.get("date")))
        except ValueError:
            continue
        if rate is not None and _keep(quote, BASE_CURRENCY):
            rates.append(FetchedRate(str(quote).upper(), rate, rate_date))
    if not rates:
        raise RateProviderError(source, "no_rates")
    return RateFetch(source, BASE_CURRENCY, rates)


async def _get_json(client: httpx.AsyncClient, source: str, url: str) -> Any:
    try:
        resp = await client.get(url)
    except httpx.HTTPError as exc:  # the message would contain the URL: keep only the type
        raise RateProviderError(source, type(exc).__name__) from None
    try:
        # Exact decimals: rates never pass through binary floats.
        body = json.loads(resp.text, parse_float=Decimal)
    except ValueError:
        raise RateProviderError(source, f"http_{resp.status_code}_not_json") from None
    if resp.status_code >= 400 and not (isinstance(body, dict) and "error-type" in body):
        raise RateProviderError(source, f"http_{resp.status_code}")
    return body


async def fetch_exchangerate_api(client: httpx.AsyncClient) -> RateFetch:
    key = settings.EXCHANGE_RATE_API_KEY.get_secret_value()
    if not key:
        raise RateProviderError(SOURCE_EXCHANGERATE_API, "not_configured")
    url = f"{settings.EXCHANGE_RATE_API_URL.rstrip('/')}/{key}/latest/{BASE_CURRENCY}"
    return parse_exchangerate_api(await _get_json(client, SOURCE_EXCHANGERATE_API, url))


async def fetch_frankfurter(client: httpx.AsyncClient) -> RateFetch:
    url = f"{settings.FRANKFURTER_API_URL.rstrip('/')}/rates?base={BASE_CURRENCY}"
    return parse_frankfurter(await _get_json(client, SOURCE_FRANKFURTER, url))


Fetcher = Callable[[httpx.AsyncClient], Awaitable[RateFetch]]

# In priority order (primary first).
DEFAULT_FETCHERS: tuple[tuple[str, Fetcher], ...] = (
    (SOURCE_EXCHANGERATE_API, fetch_exchangerate_api),
    (SOURCE_FRANKFURTER, fetch_frankfurter),
)
