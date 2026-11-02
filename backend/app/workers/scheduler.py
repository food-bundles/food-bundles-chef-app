from __future__ import annotations

from arq import cron
from arq.connections import RedisSettings

from app.core.config import settings


async def startup(ctx: dict) -> None:  # type: ignore[type-arg]
    import structlog
    structlog.get_logger(__name__).info("worker_startup")


async def shutdown(ctx: dict) -> None:  # type: ignore[type-arg]
    import structlog
    structlog.get_logger(__name__).info("worker_shutdown")


class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    on_startup = startup
    on_shutdown = shutdown
    functions: list = []  # type: ignore[type-arg]
    cron_jobs: list = []  # type: ignore[type-arg]
