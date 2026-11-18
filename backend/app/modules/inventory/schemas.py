from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EntryType = Literal["opening", "adjustment", "closing", "delivery", "waste"]
StockChange = Literal["set", "add", "remove"]


class InventoryEntryCreateRequest(BaseModel):
    """Record stock for one ingredient.

    `change` says how `quantity` applies to the current level:
      set    — `quantity` IS the counted stock (stock take; default, legacy behaviour)
      add    — current + quantity
      remove — current - quantity, never below 0
    Every entry stores the resulting stock level.
    """

    ingredient_id: uuid.UUID
    quantity: Decimal = Field(..., ge=0)
    change: StockChange = "set"
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
