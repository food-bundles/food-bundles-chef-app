from __future__ import annotations

import re
import ssl

import certifi
import httpx
import structlog

from app.core.config import settings
from app.core.exceptions import AppError
from app.integrations.sms.base import SmsProvider

logger = structlog.get_logger(__name__)

PINDO_SMS_URL = "https://api.pindo.io/v1/sms/"

# Use certifi's CA bundle so TLS verification works cross-platform (incl. Windows)
_ssl_context = ssl.create_default_context(cafile=certifi.where())


def _to_e164(phone_number: str) -> str:
    """Normalize Rwandan local format (07XXXXXXXX) to E.164 (+2507XXXXXXXX)."""
    digits = re.sub(r"\D", "", phone_number)
    if digits.startswith("0") and len(digits) == 10:
        return "+250" + digits[1:]
    if digits.startswith("250") and len(digits) == 12:
        return "+" + digits
    if digits.startswith("25") and len(digits) == 11:
        return "+" + digits
    # Already E.164 or unknown format — send as-is with + prefix if missing
    return phone_number if phone_number.startswith("+") else "+" + digits


class PindoSmsProvider(SmsProvider):
    """SMS delivery via Pindo (Rwanda-based gateway). Uses JWT bearer auth."""

    async def send_otp(self, phone_number: str, code: str) -> None:
        e164 = _to_e164(phone_number)
        payload = {
            "to": e164,
            "text": f"Your Food Bundles verification code is {code}. Valid for 5 minutes.",
            "sender": settings.SMS_SENDER_ID,
        }
        headers = {
            "Authorization": f"Bearer {settings.SMS_API_KEY}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=10.0, verify=_ssl_context) as client:
                response = await client.post(PINDO_SMS_URL, json=payload, headers=headers)
        except httpx.TimeoutException:
            logger.error("pindo_sms_timeout", phone_number=phone_number)
            raise AppError("SMS service timed out. Please try again.")
        except httpx.RequestError as exc:
            logger.error("pindo_sms_request_error", phone_number=phone_number, error=str(exc))
            raise AppError("Could not reach SMS service. Please try again.")

        if response.status_code not in (200, 201):
            logger.error(
                "pindo_sms_error",
                status=response.status_code,
                body=response.text[:200],
                phone_number=phone_number,
            )
            raise AppError("Could not send verification code. Please try again.")
        logger.info("pindo_sms_sent", phone_number=e164)
