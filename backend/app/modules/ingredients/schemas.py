from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class IngredientCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    unit: str = Field(..., min_length=1, max_length=30)
    yield_fraction: Decimal = Field(Decimal("1.0"), gt=0, le=1)
    qty_per_portion: Decimal = Field(Decimal("0"), ge=0)
    cost_per_unit: Decimal | None = Field(None, ge=0)
    selling_unit_size: Decimal = Field(Decimal("1"), gt=0)
    days_open_per_week: int = Field(7, ge=1, le=7)
    safety_buffer_fraction: Decimal | None = Field(None, gt=0, le=1)
    notes: str | None = None


class IngredientUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    unit: str | None = Field(None, min_length=1, max_length=30)
    yield_fraction: Decimal | None = Field(None, gt=0, le=1)
    qty_per_portion: Decimal | None = Field(None, ge=0)
    cost_per_unit: Decimal | None = Field(None, ge=0)
    selling_unit_size: Decimal | None = Field(None, gt=0)
    days_open_per_week: int | None = Field(None, ge=1, le=7)
    safety_buffer_fraction: Decimal | None = Field(None, gt=0, le=1)
    notes: str | None = None


class IngredientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kitchen_id: uuid.UUID
    name: str
    unit: str
    yield_fraction: Decimal
    qty_per_portion: Decimal
    cost_per_unit: Decimal | None
    selling_unit_size: Decimal
    days_open_per_week: int
    safety_buffer_fraction: Decimal | None
    is_active: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime
