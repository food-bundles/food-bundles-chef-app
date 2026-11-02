from __future__ import annotations

from app.core.config import settings
from app.integrations.push_notifications.base import PushNotificationProvider


def get_push_provider() -> PushNotificationProvider:
    if settings.PUSH_NOTIFICATIONS_PROVIDER == "expo":
        from app.integrations.push_notifications.expo_provider import (
            ExpoPushNotificationProvider,
        )
        return ExpoPushNotificationProvider()
    from app.integrations.push_notifications.mock_provider import MockPushNotificationProvider
    return MockPushNotificationProvider()
