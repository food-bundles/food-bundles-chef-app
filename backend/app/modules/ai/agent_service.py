"""AI agent service — plans actions on behalf of the chef.

The agent PLANS only. It never writes to the database.
Every proposed action must be confirmed by the chef on mobile before
the real API endpoint is called.

Flow:
  1. Build kitchen context (stock, open orders, menu items)
  2. Build conversation history for Muse Spark
  3. Call Muse Spark → parse structured JSON response
  4. Return either ClarifyingQuestion or ActionProposal
"""
from __future__ import annotations

import json
import uuid
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AiDisabledError, AiProviderError
from app.integrations.meta_model_api.client import chat
from app.modules.ai.schemas.agent import (
    ActionProposal,
    ActionType,
    AgentMessage,
    AgentRequest,
    AgentResponse,
    ClarifyingQuestion,
)
from app.modules.ingredients.repository import IngredientRepository
from app.modules.inventory.service import InventoryService
from app.modules.kitchens.models import Kitchen
from app.modules.menus.repository import MenuItemRepository
from app.modules.orders.repository import OrderRepository
from app.shared.enums import OrderStatus

logger = structlog.get_logger(__name__)

_SYSTEM_PROMPT_TEMPLATE = """You are the Food Bundles kitchen assistant for chef {chef_name}.
You help chefs manage their kitchen operations: recording sales, managing inventory,
creating and cancelling orders, and receiving deliveries.

KITCHEN CONTEXT (current state):
{kitchen_context}

YOUR RULES:
1. You NEVER write to the database yourself. You only plan actions.
2. Always confirm with the chef before acting — return a confirmation proposal.
3. If any required value is missing or ambiguous, ask ONE clarifying question.
4. For undo requests, propose a reversal action (e.g. cancel an order you just created).
5. Be concise. Speak like a helpful kitchen colleague, not a corporate chatbot.
6. All quantities must be numbers. All dates must be ISO format (YYYY-MM-DD).
7. If the chef's request matches NOTHING you can do, say so clearly.

AVAILABLE ACTIONS:
- record_sale: Record portions sold for a menu item today
- record_inventory: Adjust stock quantity for an ingredient
- create_order: Create a purchase order with line items
- submit_order: Submit a draft order to the supplier
- cancel_order: Cancel a draft or submitted order
- start_delivery: Mark a confirmed order as out for delivery
- receive_delivery: Record receipt of delivered items with quantities and decisions
- undo: Reverse the last confirmed action

RESPONSE FORMAT:
You must respond with a JSON object (no markdown, no code fences) with this structure:

If you need clarification:
{{
  "type": "clarification",
  "reply_text": "What I understood and what I need to know",
  "question": "The specific question",
  "options": ["option1", "option2"]  // optional multiple-choice
}}

If you have enough info to propose an action:
{{
  "type": "proposal",
  "reply_text": "Here's what I'll do",
  "action_type": "<one of the AVAILABLE ACTIONS above>",
  "summary": "Human-readable one-liner, e.g. Accept 48 kg tomatoes from Order #1042",
  "params": {{ ... }},  // action-specific parameters
  "reversible": true
}}

If you cannot help:
{{
  "type": "none",
  "reply_text": "I can't do that, but here's what I can do..."
}}
"""


async def _build_kitchen_context(
    kitchen: Kitchen,
    db: AsyncSession,
) -> str:
    """Fetch current stock, open orders and menu items for the system prompt."""
    lines: list[str] = [f"Kitchen: {kitchen.name}"]

    # Stock levels
    inv_service = InventoryService(db)
    try:
        stock_levels = await inv_service.get_stock_levels(kitchen)
        if stock_levels:
            lines.append("\nCurrent stock:")
            for s in stock_levels[:20]:  # cap to avoid massive prompts
                lines.append(
                    f"  - {s.ingredient_name}: {s.current_stock} {s.unit} "
                    f"({s.days_cover} days cover)"
                )
        else:
            lines.append("\nNo stock recorded yet.")
    except Exception:
        lines.append("\nStock data unavailable.")

    # Open orders
    order_repo = OrderRepository(db)
    try:
        open_orders = await order_repo.list_for_kitchen(
            kitchen.id,
            status=None,
        )
        active = [
            o for o in open_orders
            if o.status in (
                OrderStatus.DRAFT,
                OrderStatus.SUBMITTED,
                OrderStatus.CONFIRMED,
                OrderStatus.OUT_FOR_DELIVERY,
            )
        ]
        if active:
            lines.append("\nOpen orders:")
            for o in active[:10]:
                lines.append(
                    f"  - Order {o.id} status={o.status.value} "
                    f"delivery={o.delivery_date or 'TBD'}"
                )
        else:
            lines.append("\nNo open orders.")
    except Exception:
        lines.append("\nOrder data unavailable.")

    # Menu items
    item_repo = MenuItemRepository(db)
    try:
        items = await item_repo.list_for_menu_all(kitchen.id)
        if items:
            lines.append("\nMenu items:")
            for item in items[:20]:
                lines.append(
                    f"  - {item.name} (id={item.id}) price={item.selling_price}"
                )
        else:
            lines.append("\nNo menu items.")
    except Exception:
        lines.append("\nMenu data unavailable.")

    return "\n".join(lines)


def _build_messages(
    agent_request: AgentRequest,
) -> list[dict[str, str]]:
    """Convert AgentMessage list to messages format for Muse Spark."""
    result = []
    for msg in agent_request.messages:
        role = "user" if msg.role.value == "chef" else "assistant"
        result.append({"role": role, "content": msg.content})
    return result


def _parse_llm_response(raw: str, last_action: ActionProposal | None) -> AgentResponse:
    """Parse Muse Spark's JSON response into AgentResponse."""
    try:
        data: dict[str, Any] = json.loads(raw.strip())
    except json.JSONDecodeError:
        # Claude returned non-JSON — treat as plain text reply with no action
        return AgentResponse(
            reply_text=raw.strip(),
            proposal=None,
            clarification=None,
            last_action=last_action,
        )

    resp_type = data.get("type", "none")
    reply_text = str(data.get("reply_text", ""))

    if resp_type == "clarification":
        return AgentResponse(
            reply_text=reply_text,
            clarification=ClarifyingQuestion(
                question=str(data.get("question", "")),
                options=data.get("options"),
            ),
            proposal=None,
            last_action=last_action,
        )

    if resp_type == "proposal":
        try:
            action_type = ActionType(data["action_type"])
        except (KeyError, ValueError):
            return AgentResponse(
                reply_text=f"I tried to plan an action but got an unrecognised type: {data.get('action_type')}. Please try again.",
                proposal=None,
                clarification=None,
                last_action=last_action,
            )
        proposal = ActionProposal(
            action_type=action_type,
            summary=str(data.get("summary", "")),
            params=data.get("params", {}),
            reversible=bool(data.get("reversible", True)),
        )
        return AgentResponse(
            reply_text=reply_text,
            proposal=proposal,
            clarification=None,
            last_action=proposal,  # update last_action so next turn can undo
        )

    # type == "none" or unknown
    return AgentResponse(
        reply_text=reply_text or "I couldn't help with that request.",
        proposal=None,
        clarification=None,
        last_action=last_action,
    )


class AgentService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def run(
        self,
        kitchen: Kitchen,
        chef_name: str,
        request: AgentRequest,
    ) -> AgentResponse:
        if not settings.AI_AGENT_ENABLED:
            raise AiDisabledError("AI agent is not enabled.")

        if not settings.MODEL_API_KEY:
            raise AiDisabledError("No LLM API key configured for the agent.")

        kitchen_context = await _build_kitchen_context(kitchen, self._db)

        system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(
            chef_name=chef_name,
            kitchen_context=kitchen_context,
        )

        messages = _build_messages(request)

        try:
            raw = await chat(system_prompt=system_prompt, messages=messages)
        except Exception as exc:
            logger.warning(
                "agent_meta_call_failed",
                kitchen_id=str(kitchen.id),
                error_type=type(exc).__name__,
                error_detail=str(exc),
            )
            raise AiProviderError(f"LLM call failed: {type(exc).__name__}: {exc}") from exc

        return _parse_llm_response(raw, last_action=request.last_confirmed_action)
