"""Schemas for the AI agent endpoint.

The agent plans actions but never executes them. Mobile confirms each
action proposal before calling the corresponding API endpoint.
"""

from __future__ import annotations

import json
from decimal import Decimal
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


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
    ADD_MENU_ITEM = "add_menu_item"
    LINK_RECIPE_INGREDIENT = "link_recipe_ingredient"
    UNDO = "undo"


# ── Per-action parameter shapes ────────────────────────────────────────────────


class RecordSaleParams(BaseModel):
    menu_item_id: str
    menu_item_name: str
    portions_sold: int
    date: str  # ISO date


class RecordInventoryParams(BaseModel):
    ingredient_id: str
    ingredient_name: str = ""
    quantity: Decimal = Field(..., ge=0)
    unit: str = ""
    change: Literal["set", "add", "remove"]
    notes: str | None = None


class CreateIngredientParams(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    unit: str = Field(..., min_length=1, max_length=30)


class AddMenuItemParams(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    selling_price: Decimal = Field(..., ge=0)
    category: Literal["main", "side", "drink", "dessert"] | None = None


class LinkRecipeIngredientParams(BaseModel):
    menu_item_id: str
    menu_item_name: str = ""
    ingredient_id: str
    ingredient_name: str = ""
    qty_per_portion: Decimal = Field(..., gt=0)
    unit: str = Field(..., min_length=1, max_length=30)


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
    # Reply language selected in the app
    language: Literal["en", "fr", "rw"] = "en"


# Params schema each action must satisfy before it reaches the chef as an action card.
ACTION_PARAMS: dict[ActionType, type[BaseModel]] = {
    ActionType.RECORD_SALE: RecordSaleParams,
    ActionType.RECORD_INVENTORY: RecordInventoryParams,
    ActionType.CREATE_INGREDIENT: CreateIngredientParams,
    ActionType.ADD_MENU_ITEM: AddMenuItemParams,
    ActionType.LINK_RECIPE_INGREDIENT: LinkRecipeIngredientParams,
    ActionType.CREATE_ORDER: CreateOrderParams,
    ActionType.SUBMIT_ORDER: OrderIdParams,
    ActionType.CANCEL_ORDER: OrderIdParams,
    ActionType.START_DELIVERY: OrderIdParams,
    ActionType.RECEIVE_DELIVERY: ReceiveDeliveryParams,
}


class ModelAgentTurn(BaseModel):
    """What the model must return for one assistant turn (validated, repaired once)."""

    type: Literal["proposal", "clarification", "answer"]
    reply_text: str = Field(..., min_length=1, max_length=2000)
    action_type: ActionType | None = None
    summary: str | None = Field(default=None, max_length=200)
    params: dict[str, Any] | None = None
    question: str | None = Field(default=None, max_length=500)
    options: list[str] | None = Field(default=None, max_length=6)

    @field_validator("params", mode="before")
    @classmethod
    def _decode_params(cls, value: Any) -> Any:
        """Anthropic sends params as a JSON-encoded string (see ModelAgentTurnWire)."""
        if isinstance(value, str):
            if not value.strip():
                return None
            decoded = json.loads(value)
            if not isinstance(decoded, dict):
                raise ValueError("params must be a JSON object")
            return decoded
        return value

    @model_validator(mode="after")
    def _check_shape(self) -> ModelAgentTurn:
        if self.type == "proposal":
            if self.action_type is None or self.action_type == ActionType.UNDO or not self.summary:
                raise ValueError("a proposal needs action_type and summary")
            params_model = ACTION_PARAMS.get(self.action_type)
            if params_model is None:
                raise ValueError(f"unsupported action_type {self.action_type}")
            # Normalise params through the typed model (raises on bad shape).
            self.params = params_model.model_validate(self.params or {}).model_dump(mode="json")
        if self.type == "clarification" and not self.question:
            raise ValueError("a clarification needs a question")
        return self


class ModelAgentTurnWire(BaseModel):
    """JSON schema sent to providers with structured outputs (Anthropic).

    Same fields as ModelAgentTurn, except `params` travels as a JSON-encoded string.
    Under structured outputs a free-form dict only allows `{}`, and a union of the
    eight typed action shapes is rejected by the API ("compiled grammar is too large",
    verified live 2026-11-18). ModelAgentTurn decodes the string and validates it
    against the typed params model of the chosen action, exactly as for Meta.
    """

    type: Literal["proposal", "clarification", "answer"]
    reply_text: str
    action_type: ActionType | None = None
    summary: str | None = None
    params: str | None = Field(
        default=None,
        description=(
            "Only for a proposal: the params object of the chosen action_type, "
            "serialised as a JSON string. null otherwise."
        ),
    )
    question: str | None = None
    options: list[str] | None = None


class AgentResponse(BaseModel):
    """Either a clarifying question or an action proposal, never both."""

    proposal: ActionProposal | None = None
    clarification: ClarifyingQuestion | None = None
    # Reply text shown in the chat regardless of which branch
    reply_text: str
    # Echo last action for undo chaining
    last_action: ActionProposal | None = None
    # Kitchen-local time (HH:MM) the kitchen data behind this reply was read
    as_of: str | None = None
