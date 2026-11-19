"""Changing a kitchen's currency: preview first, then convert or relabel (decision 3)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.modules.exchange_rates.schemas import RateOut
from app.modules.kitchens.schemas import KitchenResponse, _currency
from app.shared.schemas.money import MoneyOut

CurrencyChangeMode = Literal["convert", "relabel"]


class CurrencyChangePreviewRequest(BaseModel):
    to_currency: str = Field(..., min_length=3, max_length=3)
    # convert: every price times one stated rate (from the rates table, with its date).
    # relabel: "my prices were entered in the wrong currency" — amounts stay the same.
    mode: CurrencyChangeMode

    @field_validator("to_currency")
    @classmethod
    def _check_currency(cls, v: str) -> str:
        return _currency(v) or v


class CurrencyChangeRequest(CurrencyChangePreviewRequest):
    # relabel: the new currency code typed by the chef (e.g. "EUR").
    confirmation: str | None = Field(None, max_length=20)
    # convert: the rate and date the preview showed; refused if the table now says otherwise.
    rate: str | None = Field(None, max_length=40)
    rate_date: date | None = None


class PriceChangeOut(BaseModel):
    kind: Literal["menu_item", "ingredient_cost"]
    id: uuid.UUID
    name: str
    before: MoneyOut
    after: MoneyOut | None
    # "too_many_decimals": relabelling would need rounding (e.g. 7.99 → RWF); not allowed.
    problem: str | None = None


class KitchenHistoryOut(BaseModel):
    sales: int
    orders: int
    stock_entries: int
    deliveries: int
    has_history: bool


class CurrencyChangePreviewResponse(BaseModel):
    from_currency: str
    to_currency: str
    mode: CurrencyChangeMode
    # convert only: the rate that will be used, or rate_unavailable.
    rate: RateOut | None
    rate_unavailable: bool
    history: KitchenHistoryOut
    prices: list[PriceChangeOut]
    # Past sales, orders, deliveries and stock records keep their original currency.
    can_apply: bool
    blocked_reason: str | None
    # relabel: what the chef must type to confirm.
    confirmation_text: str | None
    # The kitchen's own price step was in the old currency and goes back to the default.
    price_step_reset: bool


class CurrencyChangeResponse(BaseModel):
    kitchen: KitchenResponse
    mode: CurrencyChangeMode
    from_currency: str
    to_currency: str
    menu_items_changed: int
    ingredient_costs_changed: int
    rate: RateOut | None


class CurrencyChangeLogEntry(BaseModel):
    changed_at: datetime
    changed_by: uuid.UUID | None
    from_currency: str | None
    to_currency: str | None
    mode: str | None
    rate: str | None
    rate_date: str | None
