from __future__ import annotations

from abc import ABC, abstractmethod


class SmsProvider(ABC):
    """Interface for OTP SMS delivery. Swap implementations via OTP_PROVIDER env var."""

    @abstractmethod
    async def send_otp(self, phone_number: str, code: str) -> None:
        """Send a 6-digit OTP to the given E.164 phone number."""
