"""Arq Redis connection pool — shared between request handlers that enqueue tasks."""
from __future__ import annotations

from arq.connections import ArqRedis, RedisSettings, create_pool

from app.core.config import settings

_pool: ArqRedis | None = None


async def get_queue() -> ArqRedis | None:
    """Return the shared arq pool, or None if Redis is unavailable."""
    return _pool


async def connect() -> None:
    global _pool
    try:
        _pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    except Exception:
        import structlog
        structlog.get_logger(__name__).warning(
            "redis_unavailable_tasks_disabled",
            url=settings.REDIS_URL,
        )
        _pool = None


async def disconnect() -> None:
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None
