from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class PushMessage:
    token: str  # Expo push token
    title: str
    body: str
    data: dict | None = None  # extra payload forwarded to the app


class PushNotificationProvider(ABC):
    @abstractmethod
    async def send(self, messages: list[PushMessage]) -> None:
        """Send one or more push notifications. Failures are logged, not raised."""
