from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.shared.schemas.money import MoneyOut

MenuItemCategory = Literal["main", "side", "drink", "dessert"]


class MenuCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None


class MenuUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    is_active: bool | None = None


class MenuItemCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    selling_price: Decimal = Field(..., ge=0)
    # ISO 4217; defaults to the kitchen's currency (other currencies need conversion).
    selling_price_currency: str | None = Field(None, min_length=3, max_length=3)
    category: MenuItemCategory | None = None


class MenuItemUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    selling_price: Decimal | None = Field(None, ge=0)
    # ISO 4217; defaults to the kitchen's currency (other currencies need conversion).
    selling_price_currency: str | None = Field(None, min_length=3, max_length=3)
    is_active: bool | None = None
    category: MenuItemCategory | None = None


class MenuItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    menu_id: uuid.UUID
    kitchen_id: uuid.UUID
    name: str
    description: str | None
    category: MenuItemCategory | None = None
    # Deprecated (one release): use selling_price_money.
    selling_price: Decimal
    selling_price_currency: str | None = None
    selling_price_money: MoneyOut | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class MenuResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kitchen_id: uuid.UUID
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
