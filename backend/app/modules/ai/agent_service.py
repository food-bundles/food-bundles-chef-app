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

import asyncio
import base64
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AiDisabledError
from app.modules.ai.agent_checks import check_proposal
from app.modules.ai.clarifications import ScanAnswers, log_clarifications
from app.modules.ai.gateway.core import (
    check_rate_limit,
    language_name,
    load_prompt,
    structured_call,
    structured_stream,
    validate_image,
)
from app.modules.ai.gateway.scans import scan_context, table_rates
from app.modules.ai.registry.feature_flags import assistant_enabled
from app.modules.ai.streaming import ReplyTextExtractor
from app.modules.ai.schemas.agent import (
    ACTION_PARAMS,
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
from app.modules.sales.service import SalesService
from app.shared.enums import OrderStatus
from app.shared.kitchen_time import kitchen_now, kitchen_today

logger = structlog.get_logger(__name__)

AGENT_PROMPT = ("agent", "v3")
# Context window guard: only the most recent turns are sent to the model.
MAX_HISTORY_MESSAGES = 20
MAX_MESSAGE_CHARS = 2000


@dataclass
class KnownIds:
    """Records of the active kitchen (id → name) — proposals may only reference these."""

    ingredients: dict[str, str] = field(default_factory=dict)
    menu_items: dict[str, str] = field(default_factory=dict)
    orders: dict[str, str] = field(default_factory=dict)
    # Ingredient id → its unit, for converting the chef's units (agent/v3).
    ingredient_units: dict[str, str] = field(default_factory=dict)


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


# Shown with a server question about a price or unit (older apps show only this text).
_SERVER_QUESTION = {
    "en": "I need one detail before I can prepare that.",
    "fr": "Il me manque une précision avant de préparer cette action.",
    # Draft — pending native-speaker review (see mobile/docs/i18n-rw-review.md).
    "rw": "Nkeneye ikindi kintu kimwe mbere yo kubitegura.",
}
_READY_REPLY = {
    "en": "Here is the action to confirm.",
    "fr": "Voici l'action à confirmer.",
    # Draft — pending native-speaker review.
    "rw": "Iki ni igikorwa ugomba kwemeza.",
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
        known.ingredient_units = {str(ing.id): str(ing.unit) for ing in ingredients}
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
            # Revenue is computed here per currency; the model must never add currencies.
            _portions, subtotals = await SalesService(db).daily_revenue(kitchen, today)
            if subtotals:
                parts = "; ".join(f"{m.amount} {m.currency}" for m in subtotals)
                note = (
                    " (different currencies: do not add them together)"
                    if len(subtotals) > 1
                    else ""
                )
                lines.append(f"\nRevenue today, per currency{note}: {parts}")
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
        turn_call: Callable[..., Awaitable[ModelAgentTurn]] | None = None,
    ) -> AgentResponse:
        """One Assistant turn. `turn_call` replaces the model call (Step 1b streaming passes
        a streaming caller); everything before and after it is the same."""
        if not assistant_enabled():
            raise AiDisabledError("AI assistant is not enabled.")
        if request.resolve is None:  # answering a server question calls no model
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
        if request.resolve is not None:
            # The chef answered a server question: finish the draft, no model call.
            draft = request.resolve.draft
            return await self._finish_proposal(
                kitchen,
                request,
                draft.action_type,
                draft.summary,
                draft.params,
                request.resolve.answers,
                _READY_REPLY[request.language],
                known,
                as_of,
                request_id,
            )
        history, user_text, image = _conversation(request)
        image_mime = validate_image(image) if image is not None else None

        turn = await (turn_call or structured_call)(
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
            return await self._finish_proposal(
                kitchen,
                request,
                turn.action_type,
                turn.summary or "",
                turn.params or {},
                ScanAnswers(),
                turn.reply_text,
                known,
                as_of,
                request_id,
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

    async def _finish_proposal(
        self,
        kitchen: Kitchen,
        request: AgentRequest,
        action_type: ActionType,
        summary: str,
        raw_params: dict[str, Any],
        answers: ScanAnswers,
        reply_text: str,
        known: KnownIds,
        as_of: str,
        request_id: str,
    ) -> AgentResponse:
        """References must belong to this kitchen; prices and units are read by the server
        (agent_checks) and may turn into ONE clarifying question with the draft kept."""
        params, bad = resolve_references(action_type, raw_params, known)
        if bad:
            # Never show an action card for a record outside the active kitchen.
            logger.info(
                "agent_proposal_rejected",
                reason="unknown_reference",
                action_type=action_type.value,
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
        check = await check_proposal(
            action_type,
            params,
            ctx=scan_context(kitchen),
            ingredient_units=known.ingredient_units,
            answers=answers,
            rate_for=table_rates(self._db, kitchen),
        )
        if check.clarification is not None:
            question = check.clarification
            log_clarifications("assistant", request_id, [question])
            return AgentResponse(
                reply_text=reply_text,
                proposal=None,
                clarification=ClarifyingQuestion(
                    question=_SERVER_QUESTION[request.language],
                    options=None,
                    kind=question.kind,
                    key=question.key,
                    question_key=question.question_key,
                    params=question.params,
                    choices=question.options,
                    preselected=question.preselected,
                    draft=ActionProposal(
                        action_type=action_type, summary=summary, params=check.params
                    ),
                    answers=answers,
                ),
                last_action=request.last_confirmed_action,
                as_of=as_of,
            )
        # Validate the finished params through the typed model once more.
        typed = ACTION_PARAMS[action_type].model_validate(check.params)
        proposal = ActionProposal(
            action_type=action_type,
            summary=summary,
            params=typed.model_dump(mode="json", exclude_none=False),
            reversible=True,
        )
        return AgentResponse(
            reply_text=reply_text,
            proposal=proposal,
            clarification=None,
            last_action=proposal,
            as_of=as_of,
        )


    async def run_stream(
        self,
        kitchen: Kitchen,
        chef_name: str,
        request: AgentRequest,
        request_id: str,
        chef_id: str | None = None,
    ) -> AsyncIterator[tuple[str, Any]]:
        """Step 1b: yields ("delta", text) while the reply streams, then ("done", AgentResponse).

        Errors are raised as the usual typed errors (the endpoint turns them into an SSE
        `error` event). After the first delta a failure is AiStreamInterruptedError.
        """
        queue: asyncio.Queue[str] = asyncio.Queue()
        extractor = ReplyTextExtractor()

        def on_delta(raw: str) -> None:
            text = extractor.feed(raw)
            if text:
                queue.put_nowait(text)

        async def streaming_call(**kwargs: Any) -> ModelAgentTurn:
            return await structured_stream(
                **kwargs,
                ttft_seconds=settings.AI_TIMEOUT_CHAT_TTFT_MS / 1000,
                on_delta=on_delta,
            )

        task = asyncio.create_task(
            self.run(
                kitchen=kitchen,
                chef_name=chef_name,
                request=request,
                request_id=request_id,
                chef_id=chef_id,
                turn_call=streaming_call,
            )
        )
        try:
            while not task.done() or not queue.empty():
                getter = asyncio.ensure_future(queue.get())
                done, _ = await asyncio.wait({getter, task}, return_when=asyncio.FIRST_COMPLETED)
                if getter in done:
                    yield ("delta", getter.result())
                else:
                    getter.cancel()
            yield ("done", task.result())
        finally:
            if not task.done():
                task.cancel()
