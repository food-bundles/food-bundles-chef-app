"""Phase 8 Step 3: canary rollout of Anthropic as the primary provider.

A request is "in the canary" (Anthropic primary, Meta fallback as usual) when all hold:
- its feature is in AI_ANTHROPIC_CANARY_FEATURES (empty list = every feature);
- its kitchen's bucket is below AI_ANTHROPIC_CANARY_PERCENT. The bucket is a stable hash of
  the kitchen id (0-99), so the kitchens in the 10 % stage stay in at 50 % and 100 %;
- its kitchen's country is in AI_ANTHROPIC_CANARY_COUNTRIES (empty list = every country).

Requests outside the canary go to Meta only (skip reason "canary"). The defaults (100 %, all
features, all countries) keep today's behaviour. Changing any of them is a config change:
no deploy of new code, and setting the percent to 0 is a one-change rollback.
"""

from __future__ import annotations

import hashlib
import time
from collections.abc import Awaitable, Callable

from app.core.config import settings

CountryLookup = Callable[[str], Awaitable[str | None]]

_COUNTRY_TTL_SECONDS = 600.0


def kitchen_bucket(kitchen_id: str) -> int:
    """Stable 0-99 bucket for a kitchen (same on every server and restart)."""
    digest = hashlib.sha256(kitchen_id.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % 100


async def _db_country(kitchen_id: str) -> str | None:
    import uuid

    from app.core.database import AsyncSessionFactory
    from app.modules.kitchens.models import Kitchen

    try:
        key = uuid.UUID(kitchen_id)
    except ValueError:
        return None
    async with AsyncSessionFactory() as session:
        kitchen = await session.get(Kitchen, key)
        return kitchen.country if kitchen else None


class Canary:
    def __init__(
        self,
        country_lookup: CountryLookup | None = None,
        *,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._lookup = country_lookup or _db_country
        self._clock = clock
        self._countries: dict[str, tuple[str | None, float]] = {}

    async def _country(self, kitchen_id: str) -> str | None:
        cached = self._countries.get(kitchen_id)
        now = self._clock()
        if cached and now - cached[1] < _COUNTRY_TTL_SECONDS:
            return cached[0]
        country = await self._lookup(kitchen_id)
        self._countries[kitchen_id] = (country, now)
        return country

    async def includes(self, kitchen_id: str, feature: str) -> bool:
        """True when this kitchen and feature use Anthropic as the primary provider."""
        features = settings.AI_ANTHROPIC_CANARY_FEATURES
        if features and feature not in features:
            return False
        percent = max(0, min(100, settings.AI_ANTHROPIC_CANARY_PERCENT))
        if percent < 100 and kitchen_bucket(kitchen_id) >= percent:
            return False
        countries = settings.AI_ANTHROPIC_CANARY_COUNTRIES
        if countries:
            return (await self._country(kitchen_id)) in countries
        return True


canary = Canary()
