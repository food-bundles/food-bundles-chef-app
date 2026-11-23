from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["chef", "waiter", "cashier"]
CommandType = Literal["dine_in", "to_go"]
CommandStatus = Literal["new", "cooking", "served", "handed", "declined", "cancelled"]


class StaffCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    role: Role


class StaffUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    role: Role | None = None
    is_active: bool | None = None


class StaffResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kitchen_id: uuid.UUID
    name: str
    role: Role
    is_active: bool


class CommandLineRequest(BaseModel):
    menu_item_id: uuid.UUID
    qty: int = Field(..., ge=1, le=500)


class CommandCreateRequest(BaseModel):
    # Client-generated id (offline): sending the same command twice returns the first one.
    id: uuid.UUID | None = None
    type: CommandType
    table_no: str | None = Field(None, max_length=10)
    # A kitchen staff member, or none = the chef (the logged-in account).
    staff_id: uuid.UUID | None = None
    lines: list[CommandLineRequest] = Field(..., min_length=1, max_length=50)


class AcceptRequest(BaseModel):
    # "Accept X of Y": portions to accept per line id; omitted = the whole command.
    portions: dict[uuid.UUID, int] | None = None


class DeclineRequest(BaseModel):
    add_to_requisition: bool = True


class CommandLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    menu_item_id: uuid.UUID
    dish_name: str
    qty: int
    accepted_qty: int | None
    unit_price: Decimal
    unit_price_currency: str


class MissingResponse(BaseModel):
    ingredient_id: uuid.UUID
    name: str
    unit: str
    need: Decimal
    have: Decimal
    short: Decimal


class StockCheckResponse(BaseModel):
    enough: bool
    missing: list[MissingResponse]
    max_portions: int
    total_portions: int
    # The restaurant's message if declined: "Declined – not enough Chicken (short 0.3 kg)."
    decline_message: str | None = None


class CommandResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kitchen_id: uuid.UUID
    service_date: date
    number: int
    type: CommandType
    table_no: str | None
    source: str
    recorded_by_name: str
    recorded_by_role: Role
    status: CommandStatus
    decline_message: str | None
    created_at: datetime
    lines: list[CommandLineResponse]
    # Only for New commands: can the stock cover it?
    stock_check: StockCheckResponse | None = None


class DishToday(BaseModel):
    menu_item_id: uuid.UUID
    name: str
    category: str | None
    selling_price: Decimal
    currency: str | None
    is_active: bool
    # Portions in today's commands, cancelled and declined excluded (ORDERED_TODAY_EXCLUDES).
    ordered_today: int
    # Portions the stock can still make; null when the dish has no recipe.
    can_make: int | None


class CommandCounts(BaseModel):
    new: int = 0
    cooking: int = 0
    served: int = 0
    cancelled: int = 0
    declined: int = 0


class CommandsTodayResponse(BaseModel):
    service_date: date
    opening_time: str
    next_number: int
    counts: CommandCounts
    commands: list[CommandResponse]
    dishes: list[DishToday]
