from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.shared.schemas.money import MoneyOut


class DailySaleRecordRequest(BaseModel):
    menu_item_id: uuid.UUID
    sale_date: date
    portions_sold: int = Field(..., ge=0)


class DailySaleRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kitchen_id: uuid.UUID
    menu_item_id: uuid.UUID
    sale_date: date
    portions_sold: int
    recorded_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class WeeklySalesSummary(BaseModel):
    menu_item_id: uuid.UUID
    menu_item_name: str
    weeks: list[WeeklyTotal]


class WeeklyTotal(BaseModel):
    week_start: date
    total_portions: int


class DailySalesSummary(BaseModel):
    """Same-day sales: revenue per currency, never added across currencies.

    `revenue` is the subtotal in the kitchen's `currency` (kept for installed app
    versions); `revenue_by_currency` lists every subtotal, kitchen currency first.
    `mixed_currencies` is true when the day has sales in more than one currency
    (e.g. after a currency change).
    """

    day: date
    portions: int
    revenue: Decimal
    currency: str
    revenue_by_currency: list[MoneyOut] = []
    mixed_currencies: bool = False
