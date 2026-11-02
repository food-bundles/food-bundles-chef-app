from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


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
