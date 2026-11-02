from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


EntryType = Literal["opening", "adjustment", "closing", "delivery"]


class InventoryEntryCreateRequest(BaseModel):
    ingredient_id: uuid.UUID
    quantity: Decimal = Field(..., ge=0)
    entry_type: EntryType = "adjustment"
    notes: str | None = None


class InventoryEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kitchen_id: uuid.UUID
    ingredient_id: uuid.UUID
    quantity: Decimal
    entry_type: str
    notes: str | None
    recorded_by: uuid.UUID | None
    recorded_at: datetime


class StockLevelResponse(BaseModel):
    """Computed stock snapshot for an ingredient — latest entry + derived fields."""

    ingredient_id: uuid.UUID
    ingredient_name: str
    unit: str
    current_stock: Decimal
    expected_daily_use: Decimal | None
    days_cover: Decimal | None
    is_low_stock: bool
    last_recorded_at: datetime | None
