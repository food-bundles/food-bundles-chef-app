"""Runtime kill switch per provider, shared by all API instances through Redis.

Flipping it takes effect within a few seconds, without a deploy or restart
(ANTHROPIC_ENABLED=false needs a restart). If Redis is unreachable the switch
reads as "off" (fail-open) and a warning is logged once; ANTHROPIC_ENABLED
remains the hard off switch.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

import structlog
from app.core.config import settings

logger = structlog.get_logger(__name__)

_KEY = "ai:killswitch:{provider}"
_TTL_SECONDS = 5.0


class KillSwitch:
    def __init__(self) -> None:
        self._cache: dict[str, tuple[float, bool]] = {}
        self._local: dict[str, bool] = {}  # used when Redis is unavailable
        self._warned = False
        self._redis = None

    def _client(self) -> Any:
        if self._redis is None:
            from redis import asyncio as aioredis

            from_url: Any = aioredis.from_url  # redis-py's from_url is untyped
            self._redis = from_url(
                settings.REDIS_URL, socket_timeout=0.3, socket_connect_timeout=0.3
            )
        return self._redis

    async def is_on(self, provider: str) -> bool:
        now = time.monotonic()
        hit = self._cache.get(provider)
        if hit is not None and hit[0] > now:
            return hit[1]
        try:
            value = await self._client().get(_KEY.format(provider=provider))
            on = value is not None and value not in (b"0", "0")
        except Exception:
            if not self._warned:
                logger.warning("ai_killswitch_redis_unavailable")
                self._warned = True
            on = self._local.get(provider, False)
        self._cache[provider] = (now + _TTL_SECONDS, on)
        return on

    async def ping(self) -> bool:
        """True when Redis answers within 0.5 s (reported as redis_connected in /ai/health)."""
        try:
            return bool(await asyncio.wait_for(self._client().ping(), timeout=0.5))
        except Exception:
            return False

    async def set(self, provider: str, on: bool) -> None:
        self._local[provider] = on
        self._cache.pop(provider, None)
        try:
            client = self._client()
            if on:
                await client.set(_KEY.format(provider=provider), "1")
            else:
                await client.delete(_KEY.format(provider=provider))
        except Exception:
            logger.warning("ai_killswitch_redis_unavailable", provider=provider)


kill_switch = KillSwitch()
