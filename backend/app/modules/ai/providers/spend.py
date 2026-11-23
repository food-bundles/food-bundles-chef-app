"""Daily AI spend: persisted per (day, scope, provider, model) with an atomic upsert.

Budget checks read today's totals through a short in-memory cache (≤ 60 s) and
add this process's own recent spend so a burst can't overshoot by a whole TTL.
Accounting never fails a chef's request: database errors are logged and swallowed.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any, Literal

import structlog
from app.core.config import settings
from app.modules.ai.models import AiSpendDaily
from app.modules.ai.providers.base import Usage
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)

GLOBAL = "global"
CACHE_TTL_SECONDS = 30.0
Action = Literal["ok", "cheaper_tier", "fallback", "block"]


@dataclass(frozen=True)
class BudgetDecision:
    action: Action
    scope: str | None = None  # which budget was reached


def _today() -> date:
    return datetime.now(UTC).date()


def _session_factory() -> Callable[[], Any]:
    from app.core.database import AsyncSessionFactory

    return AsyncSessionFactory


async def _upsert(session: AsyncSession, values: dict[str, Any]) -> None:
    dialect = session.bind.dialect.name if session.bind is not None else "postgresql"
    if dialect == "sqlite":
        from sqlalchemy.dialects.sqlite import insert
    else:
        from sqlalchemy.dialects.postgresql import insert
    stmt = insert(AiSpendDaily).values(**values)
    excluded = stmt.excluded
    stmt = stmt.on_conflict_do_update(
        index_elements=["day", "scope", "provider", "model"],
        set_={
            "requests": AiSpendDaily.requests + excluded.requests,
            "input_tokens": AiSpendDaily.input_tokens + excluded.input_tokens,
            "output_tokens": AiSpendDaily.output_tokens + excluded.output_tokens,
            "cached_tokens": AiSpendDaily.cached_tokens + excluded.cached_tokens,
            "cost_usd": AiSpendDaily.cost_usd + excluded.cost_usd,
            "updated_at": excluded.updated_at,
        },
    )
    await session.execute(stmt)


class SpendTracker:
    def __init__(
        self,
        session_factory: Callable[[], Any] | None = None,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._factory = session_factory
        self._clock = clock
        self._cache: dict[tuple[date, str], tuple[float, float]] = {}  # → (expires, usd)
        self._alerted: set[tuple[date, str]] = set()

    def _sessions(self) -> Callable[[], Any]:
        return self._factory or _session_factory()

    async def record(
        self, *, kitchen_id: str, provider: str, model: str, usage: Usage, cost: float
    ) -> None:
        day = _today()
        now = datetime.now(UTC)
        try:
            async with self._sessions()() as session:
                for scope in (GLOBAL, kitchen_id):
                    await _upsert(
                        session,
                        {
                            "day": day,
                            "scope": scope,
                            "provider": provider,
                            "model": model,
                            "requests": 1,
                            "input_tokens": usage.input_tokens,
                            "output_tokens": usage.output_tokens,
                            "cached_tokens": usage.cached_tokens,
                            "cost_usd": Decimal(str(cost)),
                            "updated_at": now,
                        },
                    )
                await session.commit()
        except Exception as exc:  # accounting must never break the feature
            logger.warning("ai_spend_record_failed", error=type(exc).__name__)
            return
        for scope in (GLOBAL, kitchen_id):
            hit = self._cache.get((day, scope))
            if hit is not None:
                self._cache[(day, scope)] = (hit[0], hit[1] + cost)

    async def total(self, scope: str) -> float:
        day = _today()
        hit = self._cache.get((day, scope))
        if hit is not None and hit[0] > self._clock():
            return hit[1]
        try:
            async with self._sessions()() as session:
                value = await session.scalar(
                    select(func.coalesce(func.sum(AiSpendDaily.cost_usd), 0)).where(
                        AiSpendDaily.day == day, AiSpendDaily.scope == scope
                    )
                )
            usd = float(value or 0)
        except Exception as exc:
            logger.warning("ai_spend_read_failed", error=type(exc).__name__)
            usd = hit[1] if hit is not None else 0.0
        self._cache[(day, scope)] = (self._clock() + CACHE_TTL_SECONDS, usd)
        return usd

    async def check(self, kitchen_id: str) -> BudgetDecision:
        """Is a new call within today's global and per-kitchen budgets?"""
        checks = [
            (GLOBAL, settings.AI_DAILY_BUDGET_USD),
            (kitchen_id, settings.AI_KITCHEN_DAILY_BUDGET_USD),
        ]
        for scope, cap in checks:
            if cap <= 0:
                continue
            spent = await self.total(scope)
            self._maybe_alert(scope, spent, cap)
            if spent >= cap:
                logger.warning(
                    "ai_budget_reached",
                    scope="global" if scope == GLOBAL else "kitchen",
                    kitchen_id=None if scope == GLOBAL else scope,
                    action=settings.AI_BUDGET_EXCEEDED_ACTION,
                )
                return BudgetDecision(action=settings.AI_BUDGET_EXCEEDED_ACTION, scope=scope)
        return BudgetDecision(action="ok")

    def _maybe_alert(self, scope: str, spent: float, cap: float) -> None:
        key = (_today(), scope)
        if spent >= 0.8 * cap and key not in self._alerted:
            self._alerted.add(key)
            logger.warning(
                "ai_budget_alert",
                scope="global" if scope == GLOBAL else "kitchen",
                kitchen_id=None if scope == GLOBAL else scope,
                percent=round(100 * spent / cap),
            )


spend_tracker = SpendTracker()
