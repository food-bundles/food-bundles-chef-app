from __future__ import annotations

import structlog

from app.integrations.push_notifications.base import PushMessage, PushNotificationProvider

logger = structlog.get_logger(__name__)


class MockPushNotificationProvider(PushNotificationProvider):
    async def send(self, messages: list[PushMessage]) -> None:
        for msg in messages:
            logger.info(
                "mock_push_notification",
                token=msg.token[:20] + "...",
                title=msg.title,
                body=msg.body,
            )
