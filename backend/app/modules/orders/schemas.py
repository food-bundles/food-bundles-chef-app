from __future__ import annotations

from typing import Literal

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.shared.enums import OrderStatus
from app.shared.schemas.money import MoneyOut


class OrderLineCreate(BaseModel):
    catalog_product_id: str = Field(..., min_length=1, max_length=100)
    product_name: str = Field(..., min_length=1, max_length=200)
    unit: str = Field(..., min_length=1, max_length=30)
    quantity_ordered: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    # ISO 4217; defaults to the kitchen's currency (other currencies need conversion).
    unit_price_currency: str | None = Field(None, min_length=3, max_length=3)
    ingredient_id: uuid.UUID | None = None


class OrderCreateRequest(BaseModel):
    delivery_date: date | None = None
    notes: str | None = None
    # Phase 9: how the requisition is bought (pay myself / send to restaurant / WhatsApp).
    route: Literal["pay", "restaurant", "whatsapp"] | None = None
    lines: list[OrderLineCreate] = Field(..., min_length=1)


class OrderLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    catalog_product_id: str
    product_name: str
    unit: str
    quantity_ordered: Decimal
    # Deprecated (one release): use unit_price_money.
    unit_price: Decimal
    unit_price_currency: str | None = None
    unit_price_money: MoneyOut | None = None
    ingredient_id: uuid.UUID | None


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kitchen_id: uuid.UUID
    chef_id: uuid.UUID
    external_order_id: str | None
    status: OrderStatus
    delivery_date: date | None
    notes: str | None
    route: str | None = None
    created_at: datetime
    updated_at: datetime


class OrderWithLinesResponse(OrderResponse):
    lines: list[OrderLineResponse]


class OrderSubmitResponse(BaseModel):
    order_id: uuid.UUID
    external_order_id: str | None
    status: OrderStatus
    message: str
