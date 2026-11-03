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
import re
import uuid
from datetime import date
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
You act on behalf of the chef — you plan actions and they confirm once. Be decisive and helpful.

KITCHEN CONTEXT:
{kitchen_context}

RULES:
1. You NEVER write to the database — you only propose actions. The chef confirms once.
2. ACT on the first message if you have enough information. Do NOT ask for things you already know.
3. Only ask a clarifying question when a critical piece of information is genuinely absent (e.g. the chef says "order bananas" with no quantity at all). Ask at most ONE question.
4. If quantities, items, or action are clear from the conversation — propose immediately without asking again.
5. When the chef says "yes", "yeah", "proceed", "go ahead", "confirm", "do it" — treat that as confirmation of the last proposal and proceed with the action.
6. Be concise. Talk like a kitchen colleague, not a corporate assistant. No filler phrases.
7. Quantities must be numbers. Dates must be ISO format (YYYY-MM-DD). Today is {today}.

AVAILABLE ACTIONS AND THEIR PARAMS:

record_sale — record portions sold for a menu item
  params: {{ "menu_item_id": "<id from context>", "portions_sold": <number>, "date": "<YYYY-MM-DD>" }}

record_inventory — adjust stock quantity
  params: {{ "ingredient_id": "<id from context>", "quantity": "<number as string>", "entry_type": "adjustment|delivery|waste", "notes": "<optional string or null>" }}

create_order — create a purchase order
  params: {{ "delivery_date": "<YYYY-MM-DD or null>", "notes": "<string or null>",
    "lines": [
      {{ "catalog_product_id": "manual", "product_name": "<item name>", "unit": "<kg|pieces|litres|etc>", "quantity_ordered": "<number>", "unit_price": "0", "ingredient_id": null }}
    ]
  }}
  IMPORTANT: Always use "manual" for catalog_product_id and "0" for unit_price. Use the product name the chef gave you. Never refuse to create an order because a product is not in the catalog.

submit_order — submit a draft order to supplier
  params: {{ "order_id": "<id from context>" }}

cancel_order — cancel a draft or submitted order
  params: {{ "order_id": "<id from context>" }}

start_delivery — mark a confirmed order as out for delivery
  params: {{ "order_id": "<id from context>" }}

receive_delivery — record received items
  params: {{ "order_id": "<id from context>", "lines": [{{ "order_line_id": "<id>", "quantity_received": "<number>", "decision": "accepted|partially-accepted|rejected", "rejection_reason": null }}] }}

undo — reverse last action
  params: {{}}

RESPONSE FORMAT — respond with ONLY a raw JSON object, no markdown, no code fences, no text before or after:

Propose an action (use this whenever you have enough information):
{{"type":"proposal","reply_text":"<friendly 1-2 sentence explanation>","action_type":"<action>","summary":"<short human-readable summary>","params":{{...}},"reversible":true}}

Ask for missing critical info (only when truly needed):
{{"type":"clarification","reply_text":"<what you understood>","question":"<single specific question>","options":["<opt1>","<opt2>"]}}

Cannot help:
{{"type":"none","reply_text":"<brief explanation of what you can and cannot do>"}}
"""


async def _build_kitchen_context(
    kitchen: Kitchen,
    db: AsyncSession,
) -> str:
    """Fetch current stock, open orders and menu items for the system prompt."""
    lines: list[str] = [f"Kitchen: {kitchen.name}"]

    # Ingredients with IDs (needed for record_inventory params)
    ing_repo = IngredientRepository(db)
    try:
        ingredients = await ing_repo.list_for_kitchen(kitchen.id)
        if ingredients:
            lines.append("\nIngredients (use id for record_inventory):")
            for ing in ingredients[:30]:
                lines.append(f"  - {ing.name} id={ing.id} unit={ing.unit}")
        else:
            lines.append("\nNo ingredients configured yet.")
    except Exception:
        lines.append("\nIngredient data unavailable.")

    # Stock levels
    inv_service = InventoryService(db)
    try:
        stock_levels = await inv_service.get_stock_levels(kitchen)
        if stock_levels:
            lines.append("\nCurrent stock:")
            for s in stock_levels[:20]:
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


def _extract_json(raw: str) -> str:
    """Pull the first {...} block from a string that may have preamble or markdown fences."""
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fenced:
        return fenced.group(1)
    # Find first { ... } that spans to the matching closing brace
    start = raw.find("{")
    if start == -1:
        return raw
    depth = 0
    for i, ch in enumerate(raw[start:], start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return raw[start : i + 1]
    return raw[start:]


def _parse_llm_response(raw: str, last_action: ActionProposal | None) -> AgentResponse:
    """Parse Muse Spark's JSON response into AgentResponse."""
    try:
        data: dict[str, Any] = json.loads(_extract_json(raw))
    except json.JSONDecodeError:
        # Model returned non-JSON plain text — show it directly
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
            today=date.today().isoformat(),
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
