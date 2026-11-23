"""Arq cron task: fetch exchange rates into the exchange_rates table (its only writer)."""

from __future__ import annotations

import structlog

from app.core.database import AsyncSessionFactory
from app.modules.exchange_rates.health import warn_unavailable_currencies
from app.modules.exchange_rates.store import refresh_rates

logger = structlog.get_logger(__name__)


async def refresh_exchange_rates(ctx: dict) -> None:  # type: ignore[type-arg]
    """Twice a day: ExchangeRate-API (when a key is set) and Frankfurter, both stored with
    their source; conversion prefers the primary for the same day."""
    async with AsyncSessionFactory() as db:
        stored = await refresh_rates(db)
        await db.commit()
        # A kitchen currency without a usable rate shows "rate unavailable": warn ops.
        await warn_unavailable_currencies(db)
    logger.info("exchange_rates_refreshed", sources=sorted(stored))
