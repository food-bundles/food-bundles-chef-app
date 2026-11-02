from __future__ import annotations

import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class RecipeLineCreateRequest(BaseModel):
    ingredient_id: uuid.UUID
    qty_per_portion: Decimal = Field(..., gt=0)
    yield_fraction_override: Decimal | None = Field(None, gt=0, le=1)
    unit: str = Field(..., min_length=1, max_length=30)
    notes: str | None = None


class RecipeLineUpdateRequest(BaseModel):
    qty_per_portion: Decimal | None = Field(None, gt=0)
    yield_fraction_override: Decimal | None = Field(None, gt=0, le=1)
    unit: str | None = Field(None, min_length=1, max_length=30)
    notes: str | None = None


class RecipeLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    menu_item_id: uuid.UUID
    ingredient_id: uuid.UUID
    qty_per_portion: Decimal
    yield_fraction_override: Decimal | None
    unit: str
    notes: str | None


class RecipeCostResponse(BaseModel):
    """Calculated cost breakdown for one portion of a menu item."""

    menu_item_id: uuid.UUID
    total_cost: Decimal
    lines: list[RecipeLineCostDetail]


class RecipeLineCostDetail(BaseModel):
    ingredient_id: uuid.UUID
    ingredient_name: str
    qty_per_portion: Decimal
    yield_fraction: Decimal
    cost_per_unit: Decimal | None
    line_cost: Decimal | None
