"""Schemas for the AI agent endpoint.

The agent plans actions but never executes them. Mobile confirms each
action proposal before calling the corresponding API endpoint.
"""
from __future__ import annotations

from decimal import Decimal
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field


class AgentRole(StrEnum):
    CHEF = "chef"
    AGENT = "agent"


class AgentMessage(BaseModel):
    role: AgentRole
    content: str
    image_data: str | None = None  # base64 JPEG for multimodal chef messages


# ── Action types the agent may propose ────────────────────────────────────────

class ActionType(StrEnum):
    RECORD_SALE = "record_sale"
    RECORD_INVENTORY = "record_inventory"
    CREATE_INGREDIENT = "create_ingredient"
    CREATE_ORDER = "create_order"
    SUBMIT_ORDER = "submit_order"
    CANCEL_ORDER = "cancel_order"
    START_DELIVERY = "start_delivery"
    RECEIVE_DELIVERY = "receive_delivery"
    UNDO = "undo"


# ── Per-action parameter shapes ────────────────────────────────────────────────

class RecordSaleParams(BaseModel):
    menu_item_id: str
    menu_item_name: str
    portions_sold: int
    date: str  # ISO date


class RecordInventoryParams(BaseModel):
    ingredient_id: str
    ingredient_name: str
    quantity: Decimal
    unit: str
    entry_type: Literal["adjustment", "daily_use", "waste", "purchase"]
    notes: str | None = None


class OrderLineParams(BaseModel):
    catalog_product_id: str
    product_name: str
    unit: str
    quantity_ordered: Decimal
    unit_price: Decimal
    ingredient_id: str | None = None


class CreateOrderParams(BaseModel):
    delivery_date: str | None = None  # ISO date
    notes: str | None = None
    lines: list[OrderLineParams]


class OrderIdParams(BaseModel):
    order_id: str


class ReceivingLineParams(BaseModel):
    order_line_id: str
    product_name: str
    quantity_received: Decimal
    decision: Literal["accepted", "partially-accepted", "rejected"]
    rejection_reason: str | None = None


class ReceiveDeliveryParams(BaseModel):
    order_id: str
    lines: list[ReceivingLineParams]


class UndoParams(BaseModel):
    action_type: ActionType
    resource_id: str
    description: str  # human-readable label of what to undo


# ── Action proposal — what agent returns when it has enough info ───────────────

class ActionProposal(BaseModel):
    """A planned action awaiting chef confirmation.

    Mobile shows this as a confirmation card. On approval the mobile
    calls the real API endpoint — the agent never writes to the DB.
    """
    action_type: ActionType
    summary: str  # e.g. "Record sale of 12 portions Jollof Rice"
    params: dict[str, Any]  # serialised from the specific Params model
    reversible: bool = True  # whether an undo action is possible after


# ── Clarifying question — what agent returns when it needs more info ───────────

class ClarifyingQuestion(BaseModel):
    question: str
    options: list[str] | None = None  # optional multiple-choice suggestions


# ── Top-level request / response ───────────────────────────────────────────────

class AgentRequest(BaseModel):
    messages: list[AgentMessage] = Field(..., min_length=1)
    # Optional: tracks the last confirmed action so the agent can offer undo
    last_confirmed_action: ActionProposal | None = None


class AgentResponse(BaseModel):
    """Either a clarifying question or an action proposal, never both."""
    proposal: ActionProposal | None = None
    clarification: ClarifyingQuestion | None = None
    # Reply text shown in the chat regardless of which branch
    reply_text: str
    # Echo last action for undo chaining
    last_action: ActionProposal | None = None
