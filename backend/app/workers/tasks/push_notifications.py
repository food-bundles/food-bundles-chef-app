"""Arq task: send push notification to a chef's device."""
from __future__ import annotations

import structlog

from app.integrations.push_notifications.base import PushMessage
from app.integrations.push_notifications.factory import get_push_provider

logger = structlog.get_logger(__name__)


async def send_push_notification(
    ctx: dict,  # type: ignore[type-arg]
    *,
    token: str,
    title: str,
    body: str,
    data: dict | None = None,  # type: ignore[type-arg]
) -> None:
    """Send a single push notification. Failures are caught and logged."""
    provider = get_push_provider()
    await provider.send([PushMessage(token=token, title=title, body=body, data=data)])
    logger.info("push_notification_sent", title=title)
