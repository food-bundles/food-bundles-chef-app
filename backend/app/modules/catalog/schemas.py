from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.shared.schemas.money import MoneyOut


class CatalogProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sku: str
    name: str
    category: str
    unit: str
    # Deprecated (one release): use reference_price_money.
    reference_price: Decimal | None
    reference_price_currency: str | None = None
    reference_price_money: MoneyOut | None = None
    description: str | None
    image_url: str | None
    is_active: bool
    updated_at: datetime
