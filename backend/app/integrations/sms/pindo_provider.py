from __future__ import annotations

import ssl

import certifi
import httpx
import structlog

from app.core.config import settings
from app.integrations.sms.base import SmsProvider

logger = structlog.get_logger(__name__)

PINDO_SMS_URL = "https://api.pindo.io/v1/sms/"

# Use certifi's CA bundle so TLS verification works cross-platform (incl. Windows)
_ssl_context = ssl.create_default_context(cafile=certifi.where())


class PindoSmsProvider(SmsProvider):
    """SMS delivery via Pindo (Rwanda-based gateway). Uses JWT bearer auth."""

    async def send_otp(self, phone_number: str, code: str) -> None:
        payload = {
            "to": phone_number,
            "text": f"Your Food Bundles verification code is {code}. Valid for 5 minutes.",
            "sender": settings.SMS_SENDER_ID,
        }
        headers = {
            "Authorization": f"Bearer {settings.SMS_API_KEY}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=10.0, verify=_ssl_context) as client:
            response = await client.post(PINDO_SMS_URL, json=payload, headers=headers)
        if response.status_code not in (200, 201):
            logger.error(
                "pindo_sms_error",
                status=response.status_code,
                phone_number=phone_number,
            )
            response.raise_for_status()
        logger.info("pindo_sms_sent", phone_number=phone_number)
