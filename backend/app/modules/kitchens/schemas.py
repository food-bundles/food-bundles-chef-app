from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.shared.enums import KitchenStatus


class KitchenCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    location: str | None = Field(None, max_length=300)
    address: str | None = Field(None, max_length=500)
    phone: str | None = Field(None, max_length=20)
    currency: str = Field("RWF", min_length=3, max_length=3)
    timezone: str = Field("Africa/Kigali", max_length=50)


class KitchenUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    location: str | None = Field(None, max_length=300)
    address: str | None = Field(None, max_length=500)
    phone: str | None = Field(None, max_length=20)
    currency: str | None = Field(None, min_length=3, max_length=3)
    timezone: str | None = Field(None, max_length=50)


class KitchenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chef_id: uuid.UUID
    name: str
    location: str | None
    address: str | None
    phone: str | None
    currency: str
    timezone: str
    status: KitchenStatus
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
