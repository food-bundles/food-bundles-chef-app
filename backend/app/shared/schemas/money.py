"""Money in API responses: a decimal string and an ISO 4217 code, never a float."""

from __future__ import annotations

from pydantic import BaseModel


class MoneyOut(BaseModel):
    amount: str
    currency: str
