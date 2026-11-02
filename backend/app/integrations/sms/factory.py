from __future__ import annotations

from app.core.config import settings
from app.integrations.sms.base import SmsProvider
from app.integrations.sms.mock_provider import MockSmsProvider


def get_sms_provider() -> SmsProvider:
    if settings.OTP_PROVIDER == "mock":
        return MockSmsProvider()
    raise NotImplementedError(
        f"SMS provider '{settings.OTP_PROVIDER}' is not yet implemented. "
        "Add an adapter in app/integrations/sms/ and register it here."
    )
