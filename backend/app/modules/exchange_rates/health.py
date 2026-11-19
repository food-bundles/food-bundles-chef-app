"""Health of the exchange-rate feed (review item A2): last successful fetch per source,
which currencies the kitchens use, how old the rate in use is, and which have none."""

from __future__ import annotations

from datetime import UTC, date, datetime

import structlog
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.exchange_rates.models import ExchangeRate
from app.modules.exchange_rates.providers import BASE_CURRENCY, SOURCE_PRIORITY
from app.modules.exchange_rates.service import ExchangeRateService
from app.modules.ingredients.models import Ingredient
from app.modules.kitchens.models import Kitchen
from app.shared.enums import KitchenStatus

logger = structlog.get_logger(__name__)


class SourceHealth(BaseModel):
    source: str
    # ExchangeRate-API needs a key (never shown); Frankfurter needs none.
    configured: bool
    last_success_at: datetime | None
    newest_rate_date: date | None
    rates_on_newest_date: int


class CurrencyRateHealth(BaseModel):
    currency: str
    kitchens: int
    rate_date: date | None
    age_days: int | None
    source: str | None


class RatesHealthResponse(BaseModel):
    checked_on: date
    max_age_days: int
    sources: list[SourceHealth]
    # Every currency a kitchen prices or costs in (USD itself needs no rate).
    currencies: list[CurrencyRateHealth]
    missing: list[str]
    oldest_rate_age_days: int | None
    healthy: bool


async def _currencies_in_use(db: AsyncSession) -> dict[str, int]:
    """Currency → number of active kitchens using it (kitchen currency or ingredient costs)."""
    rows = await db.execute(
        select(Kitchen.currency, func.count())
        .where(Kitchen.status != KitchenStatus.ARCHIVED)
        .group_by(Kitchen.currency)
    )
    used = {str(code): int(n) for code, n in rows.all()}
    cost_rows = await db.execute(
        select(Ingredient.cost_per_unit_currency, func.count(func.distinct(Ingredient.kitchen_id)))
        .join(Kitchen, Kitchen.id == Ingredient.kitchen_id)
        .where(
            Kitchen.status != KitchenStatus.ARCHIVED,
            Ingredient.cost_per_unit_currency.is_not(None),
            Ingredient.cost_per_unit_currency != Kitchen.currency,
        )
        .group_by(Ingredient.cost_per_unit_currency)
    )
    for code, n in cost_rows.all():
        used[str(code)] = max(used.get(str(code), 0), int(n))
    return used


async def rates_health(db: AsyncSession, today: date | None = None) -> RatesHealthResponse:
    """`today` defaults to the UTC date (kitchens convert on their own local date, which is
    at most one day either side)."""
    day = today or datetime.now(UTC).date()
    sources: list[SourceHealth] = []
    for source in SOURCE_PRIORITY:
        last = await db.execute(
            select(func.max(ExchangeRate.fetched_at), func.max(ExchangeRate.rate_date)).where(
                ExchangeRate.source == source
            )
        )
        last_at, newest = last.one()
        count = 0
        if newest is not None:
            count = int(
                (
                    await db.execute(
                        select(func.count()).where(
                            ExchangeRate.source == source, ExchangeRate.rate_date == newest
                        )
                    )
                ).scalar_one()
            )
        configured = (
            bool(settings.EXCHANGE_RATE_API_KEY.get_secret_value())
            if source == "exchangerate_api"
            else True
        )
        sources.append(
            SourceHealth(
                source=source,
                configured=configured,
                last_success_at=last_at,
                newest_rate_date=newest,
                rates_on_newest_date=count,
            )
        )

    rates = ExchangeRateService(db)
    currencies: list[CurrencyRateHealth] = []
    for code, kitchens in sorted((await _currencies_in_use(db)).items()):
        if code == BASE_CURRENCY:
            continue
        rate = await rates.find_rate(BASE_CURRENCY, code, day)
        currencies.append(
            CurrencyRateHealth(
                currency=code,
                kitchens=kitchens,
                rate_date=rate.rate_date if rate else None,
                age_days=(day - rate.rate_date).days if rate else None,
                source=rate.source if rate else None,
            )
        )
    missing = [c.currency for c in currencies if c.rate_date is None]
    ages = [c.age_days for c in currencies if c.age_days is not None]
    return RatesHealthResponse(
        checked_on=day,
        max_age_days=settings.RATE_STALE_DAYS,
        sources=sources,
        currencies=currencies,
        missing=missing,
        oldest_rate_age_days=max(ages) if ages else None,
        healthy=not missing and any(s.last_success_at for s in sources),
    )


async def warn_unavailable_currencies(db: AsyncSession) -> list[str]:
    """Log a warning naming every kitchen currency with no usable rate (run by the job)."""
    report = await rates_health(db)
    if report.missing:
        logger.warning(
            "exchange_rates_currency_unavailable",
            currencies=report.missing,
            max_age_days=report.max_age_days,
        )
    return report.missing


def last_fetch_at(report: RatesHealthResponse) -> datetime | None:
    """The most recent successful fetch from any source."""
    times = [s.last_success_at for s in report.sources if s.last_success_at is not None]
    return max(times) if times else None


def worker_is_alive(report: RatesHealthResponse, now: datetime, max_age_hours: float = 24) -> bool:
    """Deployment check: the worker ran the rates job recently (it runs at startup and twice
    a day, so a fetch older than 24 h means the worker or its scheduler is not running)."""
    last = last_fetch_at(report)
    if last is None:
        return False
    if last.tzinfo is None:
        last = last.replace(tzinfo=UTC)
    return (now - last).total_seconds() <= max_age_hours * 3600
