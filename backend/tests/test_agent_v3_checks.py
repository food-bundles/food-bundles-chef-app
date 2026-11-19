"""Step 2a build step 5: agent/v3. The model passes prices and units as the chef said them;
the server reads them, converts exactly, or asks ONE question with the draft kept, and the
answer finishes the proposal without another model call."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from app.core import config as cfg
from app.core.security import create_access_token
from app.modules.ai.agent_checks import check_proposal
from app.modules.ai.clarifications import ScanAnswers, ScanContext
from app.modules.ai.schemas.agent import ActionType
from app.modules.chefs.models import Chef
from app.modules.exchange_rates.service import Rate
from httpx import AsyncClient
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession

D = Decimal
RW = ScanContext("RWF", "RW", conversion_enabled=True)
FR = ScanContext("EUR", "FR", conversion_enabled=True)
UNITS = {"beef": "kg", "oil": "l", "rice": "kg"}
USD_RWF = Rate(
    "USD", "RWF", D("1477.34"), date(2026, 11, 18), "frankfurter", False, D("1477.34"), D(1)
)


async def check(
    action: ActionType, params: dict, ctx: ScanContext = RW, answers: dict | None = None
):
    async def rate_for(code: str) -> Rate | None:
        return USD_RWF if code == "USD" else None

    return await check_proposal(
        action,
        params,
        ctx=ctx,
        ingredient_units=UNITS,
        answers=ScanAnswers.model_validate(answers or {}),
        rate_for=rate_for,
    )


def menu_item(text: str) -> dict[str, Any]:
    return {"name": "Chapati", "selling_price_text": text, "category": "side"}


async def test_bare_number_is_the_kitchen_currency_without_a_question() -> None:
    result = await check(ActionType.ADD_MENU_ITEM, menu_item("1500"))
    assert result.clarification is None
    assert (result.params["selling_price"], result.params["selling_price_currency"]) == (
        "1500",
        "RWF",
    )
    assert "selling_price_text" not in result.params


async def test_five_dollars_asks_which_dollar_then_converts_at_the_table_rate() -> None:
    first = await check(ActionType.ADD_MENU_ITEM, menu_item("5 dollars"))
    assert first.clarification is not None
    assert first.clarification.kind == "currency_missing"
    assert "USD" in [o.value for o in first.clarification.options]
    assert first.params["selling_price_text"] == "5 dollars"  # the draft keeps the text

    second = await check(ActionType.ADD_MENU_ITEM, first.params, answers={"currency": "USD"})
    assert second.clarification is not None
    assert second.clarification.kind == "currency_mismatch"
    assert second.clarification.options[0].params["rate"] == "1477.34"

    done = await check(
        ActionType.ADD_MENU_ITEM, second.params, answers={"currency": "USD", "mismatch": "convert"}
    )
    assert done.clarification is None
    assert done.params["selling_price"] == "7387"  # 5 x 1477.34 = 7386.70, half-even
    assert (done.params["original_price"], done.params["original_currency"]) == ("5", "USD")
    assert (done.params["rate"], done.params["rate_date"]) == ("1477.34", "2026-11-18")


async def test_usd_price_goes_straight_to_currency_mismatch() -> None:
    result = await check(ActionType.ADD_MENU_ITEM, menu_item("USD 5"))
    assert result.clarification is not None
    assert result.clarification.kind == "currency_mismatch"


async def test_separator_and_k_suffix_are_asked() -> None:
    separator = await check(ActionType.ADD_MENU_ITEM, menu_item("1.500"), ctx=FR)
    assert separator.clarification is not None
    assert separator.clarification.kind == "ambiguous_separator"
    k = await check(ActionType.ADD_MENU_ITEM, menu_item("2.5k"))
    assert k.clarification is not None
    assert k.clarification.kind == "k_suffix"
    done = await check(ActionType.ADD_MENU_ITEM, k.params, answers={"k_suffix": "yes"})
    assert done.clarification is None
    assert done.params["selling_price"] == "2500"


async def test_a_rate_or_converted_price_from_the_model_is_dropped() -> None:
    params = {
        **menu_item("1500"),
        "rate": "1000",
        "original_price": "1",
        "original_currency": "USD",
    }
    result = await check(ActionType.ADD_MENU_ITEM, params)
    assert "rate" not in result.params
    assert "original_price" not in result.params
    assert result.params["selling_price"] == "1500"


async def test_three_pounds_of_beef_converts_without_a_question() -> None:
    params = {"ingredient_id": "beef", "quantity": "3", "unit": "lb", "change": "add"}
    result = await check(ActionType.RECORD_INVENTORY, params)
    assert result.clarification is None
    assert (result.params["quantity"], result.params["unit"]) == ("1.361", "kg")
    assert (result.params["original_quantity"], result.params["original_unit"]) == ("3", "lb")


async def test_gallon_and_bags_are_asked_then_converted() -> None:
    oil = {"ingredient_id": "oil", "quantity": "1", "unit": "gallon", "change": "add"}
    asked = await check(ActionType.RECORD_INVENTORY, oil)
    assert asked.clarification is not None
    assert asked.clarification.kind == "ambiguous_unit"
    assert [o.value for o in asked.clarification.options] == ["us", "uk"]
    uk = await check(ActionType.RECORD_INVENTORY, oil, answers={"rows": {"unit:0": "uk"}})
    assert (uk.params["quantity"], uk.params["unit"]) == ("4.546", "l")

    rice = {"ingredient_id": "rice", "quantity": "2", "unit": "bags", "change": "add"}
    bags = await check(ActionType.RECORD_INVENTORY, rice)
    assert bags.clarification is not None
    assert bags.clarification.question_key == "clarify.ambiguous_unit.pack_size"
    sized = await check(ActionType.RECORD_INVENTORY, rice, answers={"rows": {"unit:0": "25 kg"}})
    assert (sized.params["quantity"], sized.params["unit"]) == ("50", "kg")


async def test_same_unit_needs_nothing() -> None:
    params = {"ingredient_id": "rice", "quantity": "5", "unit": "kg", "change": "set"}
    result = await check(ActionType.RECORD_INVENTORY, params)
    assert result.clarification is None
    assert result.params["quantity"] == "5"


async def test_answering_a_server_question_finishes_the_draft_without_a_model_call(
    client: AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(cfg.settings, "AI_ENABLED", True)
    monkeypatch.setattr(cfg.settings, "AI_AGENT_ENABLED", True)
    # A routed provider must look configured (no call is made).
    monkeypatch.setattr(cfg.settings, "MODEL_API_KEY", SecretStr("meta-test-key"))
    monkeypatch.setattr(cfg.settings, "META_MUSE_SPARK_MODEL", "muse-spark-test")

    async def no_model(*args: Any, **kwargs: Any) -> Any:
        raise AssertionError("resolve must not call a model")

    monkeypatch.setattr("app.modules.ai.agent_service.structured_call", no_model)
    chef = Chef(phone_number="+250783300001", name="Agent Chef")
    db.add(chef)
    await db.flush()
    headers = {"Authorization": f"Bearer {create_access_token(str(chef.id))}"}
    kitchen = await client.post(
        "/api/v1/kitchens",
        json={"name": "K", "currency": "RWF", "timezone": "Africa/Kigali", "country": "RW"},
        headers=headers,
    )
    kid = kitchen.json()["id"]
    body = {
        "messages": [{"role": "chef", "content": "Add chapati for 2.5k"}],
        "language": "fr",
        "resolve": {
            "draft": {
                "action_type": "add_menu_item",
                "summary": "Add Chapati",
                "params": menu_item("2.5k"),
            },
            "answers": {},
        },
    }
    asked = await client.post(f"/api/v1/kitchens/{kid}/ai/agent", json=body, headers=headers)
    assert asked.status_code == 200, asked.text
    clarification = asked.json()["clarification"]
    assert clarification["kind"] == "k_suffix"
    assert clarification["question_key"] == "clarify.k_suffix.question"
    assert clarification["question"]  # localized fallback text for older apps
    assert clarification["draft"]["params"]["selling_price_text"] == "2.5k"

    body["resolve"] = {"draft": clarification["draft"], "answers": {"k_suffix": "yes"}}
    done = await client.post(f"/api/v1/kitchens/{kid}/ai/agent", json=body, headers=headers)
    assert done.status_code == 200, done.text
    proposal = done.json()["proposal"]
    assert proposal["action_type"] == "add_menu_item"
    assert proposal["params"]["selling_price"] == "2500"
    assert proposal["params"]["selling_price_currency"] == "RWF"
