from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ChefProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone_number: str
    name: str | None
    email: str | None
    preferred_locale: str
    country: str | None
    tin: str | None
    restaurant_id: str | None
    restaurant_name: str | None
    onboarding_completed_at: datetime | None
    is_active: bool
    expo_push_token: str | None
    created_at: datetime
    updated_at: datetime


class ChefProfileUpdateRequest(BaseModel):
    name: str | None = Field(None, max_length=200)
    email: EmailStr | None = None
    preferred_locale: str | None = Field(None, min_length=2, max_length=5)
    country: str | None = Field(None, min_length=2, max_length=2)
    tin: str | None = Field(None, max_length=50)
    restaurant_id: str | None = Field(None, max_length=50)
    restaurant_name: str | None = Field(None, max_length=200)
    onboarding_completed_at: datetime | None = None


class PushTokenRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=300)
