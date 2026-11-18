"""The assistant may only propose actions on records of the active kitchen, in a valid shape."""

from __future__ import annotations

import pytest
from app.modules.ai.agent_service import KnownIds, resolve_references
from app.modules.ai.schemas.agent import ActionType, ModelAgentTurn
from pydantic import ValidationError


def _known() -> KnownIds:
    return KnownIds(
        ingredients={"ing-potato": "Potato"},
        menu_items={"item-chips": "Chips"},
        orders={"order-1": "draft"},
    )


def _sale(menu_item_id: object, name: str = "Chips") -> dict:
    return {
        "menu_item_id": menu_item_id,
        "menu_item_name": name,
        "portions_sold": 12,
        "date": "2026-11-17",
    }


class TestResolveReferences:
    def test_id_from_another_kitchen_is_rejected(self) -> None:
        _, bad = resolve_references(
            ActionType.RECORD_SALE, _sale("item-from-other-kitchen"), _known()
        )
        assert bad == ["menu_item_id"]

    def test_non_string_id_is_rejected(self) -> None:
        _, bad = resolve_references(ActionType.RECORD_SALE, _sale(123), _known())
        assert bad == ["menu_item_id"]

    def test_card_shows_the_real_record_name_not_the_model_text(self) -> None:
        params, bad = resolve_references(
            ActionType.RECORD_SALE, _sale("item-chips", name="chipss"), _known()
        )
        assert bad == []
        assert params["menu_item_name"] == "Chips"

    def test_recipe_link_checks_dish_and_ingredient(self) -> None:
        params = {
            "menu_item_id": "item-chips",
            "ingredient_id": "ing-unknown",
            "qty_per_portion": "0.25",
            "unit": "kg",
        }
        _, bad = resolve_references(ActionType.LINK_RECIPE_INGREDIENT, params, _known())
        assert bad == ["ingredient_id"]

    def test_order_actions_need_an_order_of_this_kitchen(self) -> None:
        _, ok = resolve_references(ActionType.SUBMIT_ORDER, {"order_id": "order-1"}, _known())
        _, bad = resolve_references(ActionType.CANCEL_ORDER, {"order_id": "order-x"}, _known())
        assert ok == []
        assert bad == ["order_id"]

    def test_actions_without_references_pass_unchanged(self) -> None:
        params = {"name": "Garlic", "unit": "kg"}
        resolved, bad = resolve_references(ActionType.CREATE_INGREDIENT, params, _known())
        assert bad == []
        assert resolved == params


class TestModelAgentTurn:
    def test_proposal_params_are_validated(self) -> None:
        with pytest.raises(ValidationError):
            ModelAgentTurn(
                type="proposal",
                reply_text="Recording it.",
                action_type=ActionType.RECORD_SALE,
                summary="Record sale",
                params={"menu_item_id": "item-chips"},  # portions_sold and date missing
            )

    def test_undo_is_never_proposed_by_the_model(self) -> None:
        with pytest.raises(ValidationError):
            ModelAgentTurn(
                type="proposal",
                reply_text="Undoing.",
                action_type=ActionType.UNDO,
                summary="Undo",
                params={},
            )

    def test_negative_stock_quantity_is_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ModelAgentTurn(
                type="proposal",
                reply_text="Removing.",
                action_type=ActionType.RECORD_INVENTORY,
                summary="Remove potato",
                params={
                    "ingredient_id": "ing-potato",
                    "quantity": "-2",
                    "unit": "kg",
                    "change": "remove",
                },
            )

    def test_clarification_needs_a_question(self) -> None:
        with pytest.raises(ValidationError):
            ModelAgentTurn(type="clarification", reply_text="I need more information.")

    def test_valid_sale_proposal_is_normalised(self) -> None:
        turn = ModelAgentTurn(
            type="proposal",
            reply_text="Recording 12 Chips.",
            action_type=ActionType.RECORD_SALE,
            summary="Record 12 x Chips sold today",
            params=_sale("item-chips"),
        )
        assert turn.params is not None
        assert turn.params["portions_sold"] == 12
