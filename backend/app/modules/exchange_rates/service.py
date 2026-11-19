"""Reading exchange rates and converting amounts: the ONLY conversion path in the app.

- Rates come only from the exchange_rates table (filled by the rates job). Nothing here
  estimates, interpolates or accepts a rate from a caller or a model.
- A rate is usable up to RATE_STALE_DAYS old (its date is always returned so it can be
  shown). Older or missing → RateUnavailableError ("rate unavailable").
- Every stored rate is USD-based. A pair without USD is a cross rate computed from one
  source (never mixing sources), labelled as one, and dated by its older leg.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import RateUnavailableError
from app.modules.exchange_rates.models import ExchangeRate
from app.modules.exchange_rates.providers import BASE_CURRENCY, SOURCE_PRIORITY
from app.shared.money import minor_units
from app.shared.money_fields import known_currency

# Decimal places of a shown rate (the column keeps 12).
RATE_PLACES = Decimal("1e-12")
SOURCE_IDENTITY = "identity"


@dataclass(frozen=True)
class Rate:
    """1 `base` = `rate` `quote`, published on `rate_date` by `source`."""

    base: str
    quote: str
    rate: Decimal
    rate_date: date
    source: str
    cross: bool

    def to_api(self) -> dict[str, Any]:
        return {
            "base": self.base,
            "quote": self.quote,
            "rate": format(self.rate.normalize(), "f"),
            "rate_date": self.rate_date.isoformat(),
            "source": self.source,
            "cross": self.cross,
        }


@dataclass(frozen=True)
class Converted:
    original_amount: Decimal
    original_currency: str
    amount: Decimal
    currency: str
    rate: Rate


def currency_code(code: str) -> str:
    """Upper-case ISO 4217 code, or 422 UNKNOWN_CURRENCY."""
    return known_currency(code)


def _priority(source: str) -> int:
    return SOURCE_PRIORITY.index(source) if source in SOURCE_PRIORITY else len(SOURCE_PRIORITY)


class ExchangeRateService:
    """Rates for one request. Lookups are memoised per instance (one read per pair)."""

    def __init__(self, db: AsyncSession, stale_days: int | None = None) -> None:
        self._db = db
        self._stale_days = settings.RATE_STALE_DAYS if stale_days is None else stale_days
        self._memo: dict[tuple[str, str, date], Rate | None] = {}

    async def find_rate(self, base: str, quote: str, on_date: date) -> Rate | None:
        """The newest usable rate for the pair on `on_date`, or None (rate unavailable)."""
        base, quote = currency_code(base), currency_code(quote)
        key = (base, quote, on_date)
        if key not in self._memo:
            self._memo[key] = await self._lookup(base, quote, on_date)
        return self._memo[key]

    async def get_rate(self, base: str, quote: str, on_date: date) -> Rate:
        rate = await self.find_rate(base, quote, on_date)
        if rate is None:
            raise RateUnavailableError()
        return rate

    async def convert(
        self,
        amount: Decimal,
        from_currency: str,
        to_currency: str,
        on_date: date,
        *,
        places: int | None = None,
    ) -> Converted:
        """Convert at the table's rate. Rounded ROUND_HALF_UP to the target currency's minor
        units, or to `places` decimals (unit costs keep 6). Raises RateUnavailableError."""
        rate = await self.get_rate(from_currency, to_currency, on_date)
        return apply_rate(amount, rate, places=places)

    async def _lookup(self, base: str, quote: str, on_date: date) -> Rate | None:
        if base == quote:
            return Rate(base, quote, Decimal(1), on_date, SOURCE_IDENTITY, cross=False)
        legs = {c for c in (base, quote) if c != BASE_CURRENCY}
        earliest = on_date - timedelta(days=self._stale_days)
        rows = await self._db.execute(
            select(
                ExchangeRate.rate_date, ExchangeRate.source, ExchangeRate.quote, ExchangeRate.rate
            )
            .where(ExchangeRate.base == BASE_CURRENCY)
            .where(ExchangeRate.quote.in_(sorted(legs)))
            .where(ExchangeRate.rate_date >= earliest)
            .where(ExchangeRate.rate_date <= on_date)
        )
        # source → {quote: (day, USD rate)}, keeping each leg's newest day. Both legs of a
        # cross rate come from the SAME source. Central banks publish on different days
        # (Frankfurter: ECB's EUR can be a day ahead of BNR's RWF), so the legs may differ by
        # a day; the rate is then dated by its OLDER leg, and that is the date shown.
        newest: dict[str, dict[str, tuple[date, Decimal]]] = defaultdict(dict)
        for rate_date, source, q, value in rows.all():
            current = newest[source].get(q)
            if current is None or rate_date > current[0]:
                newest[source][q] = (rate_date, Decimal(value))
        candidates = [
            (min(day for day, _ in found.values()), source)
            for source, found in newest.items()
            if legs <= found.keys()
        ]
        if not candidates:
            return None
        rate_date, source = min(candidates, key=lambda k: (-k[0].toordinal(), _priority(k[1])))
        legs_found = {q: value for q, (_day, value) in newest[source].items()}
        usd_to_base = legs_found.get(base, Decimal(1))
        usd_to_quote = legs_found.get(quote, Decimal(1))
        value = (usd_to_quote / usd_to_base).quantize(RATE_PLACES, rounding=ROUND_HALF_UP)
        if value <= 0:
            return None
        cross = BASE_CURRENCY not in (base, quote)
        return Rate(base, quote, value, rate_date, source, cross)


def apply_rate(amount: Decimal, rate: Rate, *, places: int | None = None) -> Converted:
    decimals = minor_units(rate.quote) if places is None else places
    converted = (Decimal(amount) * rate.rate).quantize(
        Decimal(1).scaleb(-decimals), rounding=ROUND_HALF_UP
    )
    return Converted(Decimal(amount), rate.base, converted, rate.quote, rate)
