from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.shared.enums import OrderStatus


class OrderLineCreate(BaseModel):
    catalog_product_id: str = Field(..., min_length=1, max_length=100)
    product_name: str = Field(..., min_length=1, max_length=200)
    unit: str = Field(..., min_length=1, max_length=30)
    quantity_ordered: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    ingredient_id: uuid.UUID | None = None


class OrderCreateRequest(BaseModel):
    delivery_date: date | None = None
    notes: str | None = None
    lines: list[OrderLineCreate] = Field(..., min_length=1)


class OrderLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    catalog_product_id: str
    product_name: str
    unit: str
    quantity_ordered: Decimal
    unit_price: Decimal
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
    created_at: datetime
    updated_at: datetime


class OrderWithLinesResponse(OrderResponse):
    lines: list[OrderLineResponse]


class OrderSubmitResponse(BaseModel):
    order_id: uuid.UUID
    external_order_id: str | None
    status: OrderStatus
    message: str
