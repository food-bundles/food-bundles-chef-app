"""Arq worker entry point.

Run with:
    arq app.workers.scheduler.WorkerSettings

Tasks:
    send_push_notification   — fire-and-forget push to chef device
    sync_order_to_food_bundles — POST order to Food Bundles API after submit

Cron jobs (UTC):
    refresh_catalog          — hourly, pulls latest products from Food Bundles API
    send_low_stock_reminders — daily 05:00 UTC (07:00 Kigali), low-stock push alerts
"""
from __future__ import annotations

from arq import cron
from arq.connections import RedisSettings

from app.core.config import settings
from app.workers.tasks.catalog_refresh import refresh_catalog
from app.workers.tasks.daily_reminders import send_low_stock_reminders
from app.workers.tasks.order_sync import sync_order_to_food_bundles
from app.workers.tasks.push_notifications import send_push_notification


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

    functions = [
        send_push_notification,
        sync_order_to_food_bundles,
    ]

    cron_jobs = [
        # Refresh catalog every hour at :00
        cron(refresh_catalog, hour=None, minute=0),
        # Low-stock reminders daily at 05:00 UTC (07:00 Kigali, EAT = UTC+2)
        cron(send_low_stock_reminders, hour=5, minute=0),
    ]

    # Keep job results for 24 h for debugging
    keep_result = 86_400
    # Retry failed jobs once after 60 s
    max_tries = 2
