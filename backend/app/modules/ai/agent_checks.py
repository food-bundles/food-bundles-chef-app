"""Server-side checks on an Assistant proposal (agent/v3, Step 2a build step 5).

The model passes prices and quantities AS THE CHEF SAID THEM ("5 dollars", "2.5k", "3 lb",
"2 bags"). Before an action card is shown, the same deterministic parser, unit registry and
clarification policy as the scans read them:

- a price in the kitchen's currency becomes `selling_price`; a bare number is in the
  kitchen's currency (the chef is typing for this kitchen);
- another currency, "1.500", or "2.5k" → one clarifying question, with the draft proposal
  kept so the answer finishes it without another model call;
- "3 lb" → converted exactly to the ingredient's unit, the original kept;
- "1 gallon", "2 bags" → asked (US or UK? how much in one bag?).
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from decimal import Decimal
from typing import Any

from app.modules.ai.clarifications import (
    Clarification,
    ClarifyOption,
    RateLookup,
    ScanAnswers,
    ScanContext,
    order_clarifications,
    price_clarifications,
    resolve_prices,
)
from app.modules.ai.schemas.agent import ActionType
from app.shared.units import convert, parse_pack_size, parse_unit

_US_UK = {"gallon", "quart", "pint", "fl_oz"}
# (quantity param, unit param, ingredient id param) per action that carries a quantity.
_QUANTITIES: dict[ActionType, tuple[str, str, str]] = {
    ActionType.RECORD_INVENTORY: ("quantity", "unit", "ingredient_id"),
    ActionType.LINK_RECIPE_INGREDIENT: ("qty_per_portion", "unit", "ingredient_id"),
}


SERVER_ONLY_PARAMS = frozenset(
    {"selling_price_currency", "original_price", "original_currency", "rate", "rate_date",
     "original_quantity", "original_unit"}
)  # fmt: skip


@dataclass
class ProposalCheck:
    params: dict[str, Any]
    clarification: Clarification | None = None


def _num(value: Decimal) -> str:
    return format(value.normalize(), "f")


async def check_proposal(
    action_type: ActionType,
    params: dict[str, Any],
    *,
    ctx: ScanContext,
    ingredient_units: dict[str, str],
    answers: ScanAnswers,
    rate_for: RateLookup,
) -> ProposalCheck:
    # Fields only the server sets (a converted price, its rate, an original quantity) are
    # dropped from what the model or the app sent, then recomputed here.
    out = {k: v for k, v in params.items() if k not in SERVER_ONLY_PARAMS}
    if action_type == ActionType.ADD_MENU_ITEM:
        return await _check_price(out, ctx, answers, rate_for)
    if action_type in _QUANTITIES:
        return _check_quantity(action_type, out, ingredient_units, answers)
    return ProposalCheck(out)


async def _check_price(
    params: dict[str, Any], ctx: ScanContext, answers: ScanAnswers, rate_for: RateLookup
) -> ProposalCheck:
    text = params.pop("selling_price_text", None)
    if not text and params.get("selling_price") is not None:
        text = str(params["selling_price"])
    if not text:
        return ProposalCheck(params)
    # A bare number typed for this kitchen is in the kitchen's currency.
    ctx = replace(ctx, bare_number_is_kitchen_currency=True)
    prices = await resolve_prices([str(text)], [None], ctx, answers, rate_for)
    price = prices[0]
    if price.status == "ok" and price.amount is not None and price.currency == ctx.kitchen_currency:
        params["selling_price"] = _num(price.amount)
        params["selling_price_currency"] = price.currency
        if price.rate is not None and price.original_amount is not None:
            params["original_price"] = _num(price.original_amount)
            params["original_currency"] = price.original_currency
            params["rate"] = _num(price.rate.rate)
            params["rate_date"] = price.rate.rate_date.isoformat()
        return ProposalCheck(params)
    params["selling_price_text"] = text
    name = str(params.get("name", ""))
    questions = order_clarifications(
        await price_clarifications(prices, [name], ctx, answers, rate_for)
    )
    if not questions:  # e.g. "skip": no price to use
        questions = [
            Clarification(
                key="unreadable:0",
                kind="unreadable_value",
                question_key="clarify.unreadable_value.question",
                params={"name": name, "text": str(text)},
                options=[
                    ClarifyOption(value="edit", label_key="clarify.option.type_it", action="edit")
                ],  # fmt: skip
                targets=[0],
            )
        ]
    return ProposalCheck(params, questions[0])


def _check_quantity(
    action_type: ActionType,
    params: dict[str, Any],
    ingredient_units: dict[str, str],
    answers: ScanAnswers,
) -> ProposalCheck:
    qty_key, unit_key, id_key = _QUANTITIES[action_type]
    unit = str(params.get(unit_key) or "").strip()
    target = ingredient_units.get(str(params.get(id_key) or ""))
    try:
        qty = Decimal(str(params.get(qty_key)))
    except ArithmeticError:
        return ProposalCheck(params)
    if not unit or not target or unit.lower() == target.lower():
        return ProposalCheck(params)
    parsed = parse_unit(unit)
    answer = answers.rows.get("unit:0")
    source = unit
    pack_size = None
    if parsed.unit in _US_UK and parsed.measure is None and answer in ("us", "uk"):
        source = f"{answer} {unit}"
    elif answer and answer not in ("us", "uk", "keep"):
        pack_size = parse_pack_size(answer)
    result = convert(qty, source, target, pack_size=pack_size)
    if result.status == "ok" and result.qty is not None:
        params[qty_key] = _num(result.qty.quantize(Decimal("0.001")))
        params[unit_key] = target
        params["original_quantity"] = _num(qty)
        params["original_unit"] = unit
        return ProposalCheck(params)
    if result.status == "ask" and answer != "keep":
        us_uk = result.question == "us_or_uk"
        options = (
            [ClarifyOption(value="us", label_key="clarify.option.us"),
             ClarifyOption(value="uk", label_key="clarify.option.uk")]
            if us_uk
            else [ClarifyOption(value="", label_key="clarify.option.pack_size",
                                input="pack_size")]
        )  # fmt: skip
        return ProposalCheck(
            params,
            Clarification(
                key="unit:0",
                kind="ambiguous_unit",
                question_key=(
                    "clarify.ambiguous_unit.us_or_uk"
                    if us_uk
                    else "clarify.ambiguous_unit.pack_size"
                ),
                params={"unit": unit, "quantity": _num(qty), "target": target},
                options=options,
                targets=[0],
            ),
        )
    return ProposalCheck(params)
