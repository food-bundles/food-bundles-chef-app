"""AI agent service — plans actions on behalf of the chef.

The agent PLANS only. It never writes to the database. Every proposed action is
schema-validated here and shown to the chef as an action card on mobile; the mobile
app calls the real endpoint only after the chef confirms.

Flow:
  1. Build kitchen context (stock, today's sales, menu + recipe cost, open orders),
     stamped with the time it was read (the kitchen's local time)
  2. Cap the conversation (last turns only, newest image only)
  3. Structured model call → validate → one repair attempt → typed error
"""

from __future__ import annotations

import base64
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AiDisabledError
from app.modules.ai.gateway.core import (
    check_rate_limit,
    language_name,
    load_prompt,
    structured_call,
    validate_image,
)
from app.modules.ai.registry.feature_flags import assistant_enabled
from app.modules.ai.schemas.agent import (
    ActionProposal,
    ActionType,
    AgentRequest,
    AgentResponse,
    ClarifyingQuestion,
    ModelAgentTurn,
    ModelAgentTurnWire,
)
from app.modules.exchange_rates.costs import kitchen_unit_costs
from app.modules.ingredients.repository import IngredientRepository
from app.modules.inventory.service import InventoryService
from app.modules.kitchens.models import Kitchen
from app.modules.menus.repository import MenuItemRepository
from app.modules.orders.repository import OrderRepository
from app.modules.recipes.service import RecipeService
from app.modules.sales.repository import SalesRepository
from app.shared.enums import OrderStatus
from app.shared.kitchen_time import kitchen_now, kitchen_today

logger = structlog.get_logger(__name__)

AGENT_PROMPT = ("agent", "v2")
# Context window guard: only the most recent turns are sent to the model.
MAX_HISTORY_MESSAGES = 20
MAX_MESSAGE_CHARS = 2000


@dataclass
class KnownIds:
    """Records of the active kitchen (id → name) — proposals may only reference these."""

    ingredients: dict[str, str] = field(default_factory=dict)
    menu_items: dict[str, str] = field(default_factory=dict)
    orders: dict[str, str] = field(default_factory=dict)


# (id param, record bucket, name param to overwrite with the real name or None)
_REFERENCES: dict[ActionType, list[tuple[str, str, str | None]]] = {
    ActionType.RECORD_SALE: [("menu_item_id", "menu_items", "menu_item_name")],
    ActionType.RECORD_INVENTORY: [("ingredient_id", "ingredients", "ingredient_name")],
    ActionType.LINK_RECIPE_INGREDIENT: [
        ("menu_item_id", "menu_items", "menu_item_name"),
        ("ingredient_id", "ingredients", "ingredient_name"),
    ],
    ActionType.SUBMIT_ORDER: [("order_id", "orders", None)],
    ActionType.CANCEL_ORDER: [("order_id", "orders", None)],
    ActionType.START_DELIVERY: [("order_id", "orders", None)],
    ActionType.RECEIVE_DELIVERY: [("order_id", "orders", None)],
}

# Shown instead of an action card when the model referenced something outside this kitchen.
_UNKNOWN_REFERENCE_REPLY = {
    "en": "I couldn't match that to this kitchen's data.",
    "fr": "Je n'ai pas trouvé cet élément dans les données de cette cuisine.",
    "rw": "Sinabonye icyo kintu mu makuru y'iki gikoni.",
}
_UNKNOWN_REFERENCE_QUESTION = {
    "en": "Which dish, ingredient or order did you mean?",
    "fr": "De quel plat, ingrédient ou commande parlez-vous ?",
    # Draft — pending native-speaker review (see mobile/docs/i18n-rw-review.md).
    "rw": "Ni iki washakaga kuvuga?",
}


def resolve_references(
    action_type: ActionType, params: dict[str, Any], known: KnownIds
) -> tuple[dict[str, Any], list[str]]:
    """Check every referenced id belongs to the active kitchen and use the real record names.

    Returns (params with canonical names, names of params whose ids are unknown).
    """
    resolved = dict(params)
    bad: list[str] = []
    for id_param, bucket, name_param in _REFERENCES.get(action_type, []):
        records: dict[str, str] = getattr(known, bucket)
        value = params.get(id_param)
        if not isinstance(value, str) or value not in records:
            bad.append(id_param)
        elif name_param is not None:
            resolved[name_param] = records[value]
    return resolved, bad


async def _build_kitchen_context(
    kitchen: Kitchen, db: AsyncSession, now: datetime | None = None
) -> tuple[str, KnownIds]:
    """Current stock, today's sales, menu with recipe cost, and open orders — plus their ids."""
    lines: list[str] = [f"Kitchen: {kitchen.name}"]
    known = KnownIds()

    try:
        ingredients = await IngredientRepository(db).list_for_kitchen(kitchen.id)
        known.ingredients = {str(ing.id): ing.name for ing in ingredients}
        if ingredients:
            # Costs converted to the kitchen's currency by code from the rates table; the
            # model never sees or supplies an exchange rate.
            shown = ingredients[:40]
            unit_costs = await kitchen_unit_costs(db, kitchen, shown, kitchen_today(kitchen, now))
            lines.append(f"\nIngredients (id | name | unit | cost per unit {kitchen.currency}):")
            for ing in shown:
                unit_cost = unit_costs.get(ing)
                cost = format(unit_cost.amount.normalize(), "f") if unit_cost else "unknown"
                lines.append(f"  - {ing.id} | {ing.name} | {ing.unit} | {cost}")
        else:
            lines.append("\nNo ingredients configured yet.")
    except Exception:
        lines.append("\nIngredient data unavailable.")

    try:
        levels = await InventoryService(db).get_stock_levels(kitchen)
        if levels:
            lines.append("\nCurrent stock (name: quantity unit, days of cover):")
            for s in levels[:40]:
                cover = f"{s.days_cover} days" if s.days_cover is not None else "no usage data"
                low = " LOW" if s.is_low_stock else ""
                lines.append(f"  - {s.ingredient_name}: {s.current_stock} {s.unit} ({cover}){low}")
        else:
            lines.append("\nNo stock recorded yet.")
    except Exception:
        lines.append("\nStock data unavailable.")

    try:
        items = await MenuItemRepository(db).list_for_menu_all(kitchen.id)
        known.menu_items = {str(item.id): item.name for item in items}
        today = kitchen_today(kitchen, now)
        sold = dict(await SalesRepository(db).item_portions_for_day(kitchen.id, today))
        recipes = RecipeService(db)
        if items:
            cur = kitchen.currency
            lines.append(
                f"\nMenu items (id | name | price {cur} | food cost per portion {cur}"
                " | sold today):"
            )
            for item in items[:30]:
                try:
                    recipe_cost = await recipes.calculate_cost(kitchen, item.id)
                    has_cost = any(line.line_cost is not None for line in recipe_cost.lines)
                    # A partial total (a cost had no exchange rate) is not given as the cost.
                    cost_text = (
                        f"{recipe_cost.total_cost}"
                        if has_cost and recipe_cost.complete
                        else "unknown"
                    )
                except Exception:
                    cost_text = "unknown"
                sold_today = sold.get(item.id, 0)
                row = f"{item.id} | {item.name} | {item.selling_price} | {cost_text} | {sold_today}"
                lines.append(f"  - {row}")
        else:
            lines.append("\nNo menu items.")
    except Exception:
        lines.append("\nMenu data unavailable.")

    try:
        orders = await OrderRepository(db).list_for_kitchen(kitchen.id, status=None)
        # status is a plain string column: normalise through the enum (".value" on a str fails).
        known.orders = {str(o.id): OrderStatus(o.status).value for o in orders}
        active = [
            o
            for o in orders
            if o.status
            in (
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
                    f"  - Order {o.id} status={OrderStatus(o.status).value} "
                    f"delivery={o.delivery_date or 'TBD'}"
                )
        else:
            lines.append("\nNo open orders.")
    except Exception as exc:
        logger.warning("agent_context_orders_failed", error_type=type(exc).__name__)
        lines.append("\nOrder data unavailable.")

    return "\n".join(lines), known


def _conversation(request: AgentRequest) -> tuple[list[dict[str, Any]], str, bytes | None]:
    """Prior turns (capped), the final user text, and the newest image if any."""
    msgs = request.messages[-MAX_HISTORY_MESSAGES:]
    history: list[dict[str, Any]] = []
    for msg in msgs[:-1]:
        role = "user" if msg.role.value == "chef" else "assistant"
        history.append({"role": role, "content": msg.content[:MAX_MESSAGE_CHARS]})
    last = msgs[-1]
    image: bytes | None = None
    if last.image_data:
        try:
            image = base64.b64decode(last.image_data, validate=True)
        except ValueError:
            image = None
    return history, last.content[:MAX_MESSAGE_CHARS], image


class AgentService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def run(
        self,
        kitchen: Kitchen,
        chef_name: str,
        request: AgentRequest,
        request_id: str,
        chef_id: str | None = None,
    ) -> AgentResponse:
        if not assistant_enabled():
            raise AiDisabledError("AI assistant is not enabled.")
        check_rate_limit(str(kitchen.id), chef_id, tz=kitchen.timezone)

        prompt = load_prompt(*AGENT_PROMPT)
        # Kitchen data is read now; the reply is stamped with this time ("as of 14:05").
        now = kitchen_now(kitchen)
        as_of = now.strftime("%H:%M")
        kitchen_context, known = await _build_kitchen_context(kitchen, self._db)
        system = prompt.render(
            chef_name=chef_name,
            language=language_name(request.language),
            as_of=as_of,
            today=now.date().isoformat(),
            kitchen_context=kitchen_context,
        )
        history, user_text, image = _conversation(request)
        image_mime = validate_image(image) if image is not None else None

        turn = await structured_call(
            feature="assistant",
            prompt=prompt,
            system=system,
            user_text=user_text,
            schema=ModelAgentTurn,
            timeout_seconds=settings.AI_CHAT_TIMEOUT_SECONDS,
            tier="standard",
            effort=settings.ANTHROPIC_EFFORT_CHAT,
            wire_schema=ModelAgentTurnWire.model_json_schema(),
            locale=request.language,
            request_id=request_id,
            kitchen_id=str(kitchen.id),
            image=image,
            image_mime=image_mime,
            conversation=history,
        )

        if turn.type == "proposal" and turn.action_type is not None:
            params, bad = resolve_references(turn.action_type, turn.params or {}, known)
            if bad:
                # Never show an action card for a record outside the active kitchen.
                logger.info(
                    "agent_proposal_rejected",
                    reason="unknown_reference",
                    action_type=turn.action_type.value,
                    params=bad,
                    request_id=request_id,
                )
                return AgentResponse(
                    reply_text=_UNKNOWN_REFERENCE_REPLY[request.language],
                    proposal=None,
                    clarification=ClarifyingQuestion(
                        question=_UNKNOWN_REFERENCE_QUESTION[request.language], options=None
                    ),
                    last_action=request.last_confirmed_action,
                    as_of=as_of,
                )
            proposal = ActionProposal(
                action_type=turn.action_type,
                summary=turn.summary or "",
                params=params,
                reversible=True,
            )
            return AgentResponse(
                reply_text=turn.reply_text,
                proposal=proposal,
                clarification=None,
                last_action=proposal,
                as_of=as_of,
            )
        if turn.type == "clarification" and turn.question:
            return AgentResponse(
                reply_text=turn.reply_text,
                proposal=None,
                clarification=ClarifyingQuestion(question=turn.question, options=turn.options),
                last_action=request.last_confirmed_action,
                as_of=as_of,
            )
        return AgentResponse(
            reply_text=turn.reply_text,
            proposal=None,
            clarification=None,
            last_action=request.last_confirmed_action,
            as_of=as_of,
        )
