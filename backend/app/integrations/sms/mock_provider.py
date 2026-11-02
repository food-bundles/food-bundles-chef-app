from __future__ import annotations

import structlog

from app.integrations.sms.base import SmsProvider

logger = structlog.get_logger(__name__)


class MockSmsProvider(SmsProvider):
    """Development-only provider. Logs OTP to console; never sends real SMS.

    Set MOCK_OTP_CODE in .env to pin a fixed code for automated tests.
    Never use in production.
    """

    async def send_otp(self, phone_number: str, code: str) -> None:
        logger.info(
            "mock_sms_otp",
            phone_number=phone_number,
            # Log code only in dev — production providers must NEVER log OTP values
            code=code,
        )
