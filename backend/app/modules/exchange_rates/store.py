"""The ONLY writer of the exchange_rates table, used by the rates job. An architecture test
fails if any other module in app/ writes to it."""

from __future__ import annotations

import ssl
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

import certifi
import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.exchange_rates.models import ExchangeRate
from app.modules.exchange_rates.providers import (
    DEFAULT_FETCHERS,
    Fetcher,
    RateFetch,
    RateProviderError,
)

logger = structlog.get_logger(__name__)


async def store_rates(db: AsyncSession, fetch: RateFetch, now: datetime | None = None) -> int:
    """Upsert one provider's rates. For the same day, pair and source, the newer value wins."""
    if not fetch.rates:
        return 0
    fetched_at = now or datetime.now(UTC)
    dialect = db.bind.dialect.name if db.bind is not None else "postgresql"
    insert: Any
    if dialect == "sqlite":
        from sqlalchemy.dialects.sqlite import insert
    else:
        from sqlalchemy.dialects.postgresql import insert
    rows = [
        {
            "rate_date": r.rate_date,
            "base": fetch.base,
            "quote": r.quote,
            "rate": r.rate,
            "source": fetch.source,
            "provider_timestamp": r.provider_timestamp,
            "fetched_at": fetched_at,
        }
        for r in fetch.rates
    ]
    stmt = insert(ExchangeRate).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["rate_date", "base", "quote", "source"],
        set_={
            "rate": stmt.excluded.rate,
            "provider_timestamp": stmt.excluded.provider_timestamp,
            "fetched_at": stmt.excluded.fetched_at,
        },
    )
    await db.execute(stmt)
    return len(rows)


async def refresh_rates(
    db: AsyncSession,
    fetchers: Sequence[tuple[str, Fetcher]] = DEFAULT_FETCHERS,
    client: httpx.AsyncClient | None = None,
) -> dict[str, int]:
    """Fetch every source and store what each returns. A failing source never stops the
    others, so Frankfurter (the fallback) still fills the table when the primary is down."""
    stored: dict[str, int] = {}
    own_client = client is None
    http = client or httpx.AsyncClient(
        timeout=settings.EXCHANGE_RATE_TIMEOUT_SECONDS,
        verify=ssl.create_default_context(cafile=certifi.where()),
    )
    try:
        for source, fetcher in fetchers:
            try:
                fetch = await fetcher(http)
            except RateProviderError as exc:
                if exc.reason == "not_configured":
                    logger.info("exchange_rates_source_skipped", source=source)
                else:
                    logger.warning("exchange_rates_source_failed", source=source, reason=exc.reason)
                continue
            stored[source] = await store_rates(db, fetch)
            logger.info("exchange_rates_stored", source=source, count=stored[source])
    finally:
        if own_client:
            await http.aclose()
    if not stored:
        logger.error("exchange_rates_refresh_failed", sources=[s for s, _ in fetchers])
    return stored
