from __future__ import annotations

import uuid
from datetime import datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.shared.enums import KitchenStatus
from app.shared.geo import is_timezone, normalise_country
from app.shared.money import normalise_currency


def _currency(value: str | None) -> str | None:
    return None if value is None else normalise_currency(value)


def _timezone(value: str | None) -> str | None:
    if value is not None and not is_timezone(value):
        raise ValueError(f"'{value}' is not an IANA time zone (e.g. Africa/Kigali, Europe/Paris)")
    return value


def _country(value: str | None) -> str | None:
    return None if value is None else normalise_country(value)


def check_service_hours(opening: time, closing: time) -> None:
    """Closing must be after opening on the same day."""
    if closing <= opening:
        raise ValueError("closing_time must be after opening_time")


class KitchenCreateRequest(BaseModel):
    """Currency, time zone and country are required: no country's defaults are assumed."""

    name: str = Field(..., min_length=1, max_length=200)
    location: str | None = Field(None, max_length=300)
    address: str | None = Field(None, max_length=500)
    phone: str | None = Field(None, max_length=20)
    currency: str = Field(..., min_length=3, max_length=3, description="ISO 4217, e.g. RWF, EUR")
    timezone: str = Field(..., max_length=50, description="IANA zone, e.g. Africa/Kigali")
    country: str = Field(..., min_length=2, max_length=2, description="ISO 3166-1 alpha-2")
    opening_time: time = Field(time(11, 0), description="Service opens, kitchen time zone")
    closing_time: time = Field(time(22, 0), description="Service closes, same day")

    @model_validator(mode="after")
    def _check_hours(self) -> KitchenCreateRequest:
        check_service_hours(self.opening_time, self.closing_time)
        return self

    @field_validator("currency")
    @classmethod
    def _check_currency(cls, v: str | None) -> str | None:
        return _currency(v)

    @field_validator("timezone")
    @classmethod
    def _check_timezone(cls, v: str | None) -> str | None:
        return _timezone(v)

    @field_validator("country")
    @classmethod
    def _check_country(cls, v: str | None) -> str | None:
        return _country(v)


class KitchenUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    location: str | None = Field(None, max_length=300)
    address: str | None = Field(None, max_length=500)
    phone: str | None = Field(None, max_length=20)
    # Only accepted when unchanged; a real change goes through the convert / relabel flow.
    currency: str | None = Field(None, min_length=3, max_length=3)
    timezone: str | None = Field(None, max_length=50)
    country: str | None = Field(None, min_length=2, max_length=2)
    # Step for suggested selling prices (major units); 0 clears it (currency default).
    price_step: Decimal | None = Field(None, ge=0)
    opening_time: time | None = None
    closing_time: time | None = None

    @field_validator("currency")
    @classmethod
    def _check_currency(cls, v: str | None) -> str | None:
        return _currency(v)

    @field_validator("timezone")
    @classmethod
    def _check_timezone(cls, v: str | None) -> str | None:
        return _timezone(v)

    @field_validator("country")
    @classmethod
    def _check_country(cls, v: str | None) -> str | None:
        return _country(v)


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
    country: str | None
    catalog_available: bool
    conversion_enabled: bool = False
    price_step: Decimal | None = None
    opening_time: time
    closing_time: time
    status: KitchenStatus
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
