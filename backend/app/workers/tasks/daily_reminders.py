"""Arq cron task: daily low-stock reminders to chefs, at the same LOCAL hour everywhere.

The job runs every hour; each kitchen is reminded once a day, in the hour when its own
clock shows LOW_STOCK_REMINDER_LOCAL_HOUR (07:00 by default), whatever its time zone.
"""

from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime
from typing import TypeVar

import structlog

from app.core.config import settings
from app.core.database import AsyncSessionFactory
from app.integrations.push_notifications.base import PushMessage
from app.integrations.push_notifications.factory import get_push_provider
from app.modules.chefs.repository import ChefRepository
from app.modules.inventory.service import InventoryService
from app.modules.kitchens.repository import KitchenRepository
from app.shared.kitchen_time import HasTimezone, kitchen_now

logger = structlog.get_logger(__name__)


K = TypeVar("K", bound=HasTimezone)


def kitchens_due(kitchens: Iterable[K], now: datetime, local_hour: int) -> list[K]:
    """Kitchens whose local clock is in `local_hour` at the instant `now` (aware)."""
    return [k for k in kitchens if kitchen_now(k, now).hour == local_hour]


async def send_low_stock_reminders(ctx: dict) -> None:  # type: ignore[type-arg]
    """Hourly cron: kitchens where it is now the reminder hour get their low-stock push."""
    messages: list[PushMessage] = []
    now = datetime.now(UTC)

    async with AsyncSessionFactory() as db:
        kitchen_repo = KitchenRepository(db)
        inv_svc = InventoryService(db)
        chef_repo = ChefRepository(db)

        kitchens = kitchens_due(
            await kitchen_repo.list_all_active(), now, settings.LOW_STOCK_REMINDER_LOCAL_HOUR
        )
        for kitchen in kitchens:
            try:
                levels = await inv_svc.get_stock_levels(kitchen)
            except Exception:
                logger.exception("low_stock_levels_failed", kitchen_id=str(kitchen.id))
                continue
            low = [lvl for lvl in levels if lvl.is_low_stock]
            if not low:
                continue
            chef = await chef_repo.get_by_id(kitchen.chef_id)
            if not chef or not chef.expo_push_token:
                continue
            ingredient_names = ", ".join(lvl.ingredient_name for lvl in low[:3])
            suffix = f" (+{len(low) - 3} more)" if len(low) > 3 else ""
            messages.append(
                PushMessage(
                    token=chef.expo_push_token,
                    title="Low stock alert",
                    body=f"{ingredient_names}{suffix} running low in {kitchen.name}.",
                    data={"type": "low_stock", "kitchen_id": str(kitchen.id)},
                )
            )

    if messages:
        provider = get_push_provider()
        await provider.send(messages)
        logger.info("low_stock_reminders_sent", count=len(messages))
