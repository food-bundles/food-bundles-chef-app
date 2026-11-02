from __future__ import annotations

import uuid
from decimal import Decimal

from pydantic import BaseModel, Field


class PurchaseSuggestion(BaseModel):
    """Calculated order suggestion for one ingredient."""

    ingredient_id: uuid.UUID
    ingredient_name: str
    unit: str
    current_stock: Decimal
    expected_daily_use: Decimal
    days_cover: Decimal | None
    is_low_stock: bool
    # Demand inputs
    weighted_demand_portions: Decimal
    # Order calculation
    suggested_qty: Decimal
    selling_unit_size: Decimal
    # Cost estimate (None if cost_per_unit not set)
    estimated_cost: Decimal | None


class PurchaseSuggestionsResponse(BaseModel):
    kitchen_id: uuid.UUID
    suggestions: list[PurchaseSuggestion]


class PurchaseOverrideRequest(BaseModel):
    """Chef can override the suggested qty for one ingredient before ordering."""

    ingredient_id: uuid.UUID
    quantity: Decimal = Field(..., ge=0)
