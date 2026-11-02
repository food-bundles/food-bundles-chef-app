from __future__ import annotations

import ssl

import certifi
import httpx
import structlog

from app.core.config import settings
from app.integrations.push_notifications.base import PushMessage, PushNotificationProvider

logger = structlog.get_logger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
_ssl_context = ssl.create_default_context(cafile=certifi.where())

# Expo allows up to 100 messages per request
_BATCH_SIZE = 100


class ExpoPushNotificationProvider(PushNotificationProvider):
    """Sends push notifications via Expo's push API."""

    async def send(self, messages: list[PushMessage]) -> None:
        if not messages:
            return
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
        }
        if settings.EXPO_ACCESS_TOKEN:
            headers["Authorization"] = f"Bearer {settings.EXPO_ACCESS_TOKEN}"

        async with httpx.AsyncClient(timeout=10.0, verify=_ssl_context) as client:
            for i in range(0, len(messages), _BATCH_SIZE):
                batch = messages[i : i + _BATCH_SIZE]
                payload = [
                    {
                        "to": msg.token,
                        "title": msg.title,
                        "body": msg.body,
                        **({"data": msg.data} if msg.data else {}),
                        "sound": "default",
                    }
                    for msg in batch
                ]
                try:
                    resp = await client.post(EXPO_PUSH_URL, json=payload, headers=headers)
                    resp.raise_for_status()
                    result = resp.json()
                    # Log any per-message errors from Expo
                    for idx, item in enumerate(result.get("data", [])):
                        if item.get("status") == "error":
                            logger.warning(
                                "expo_push_error",
                                token=batch[idx].token[:20],
                                code=item.get("details", {}).get("error"),
                                message=item.get("message"),
                            )
                except Exception:
                    logger.exception("expo_push_batch_failed", batch_size=len(batch))
