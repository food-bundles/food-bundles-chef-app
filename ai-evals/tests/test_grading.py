"""Unit tests for the Phase 8 parity graders (no network)."""

from __future__ import annotations

import sys
from decimal import Decimal
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evallib import grading

D = Decimal


# ── names and numbers ─────────────────────────────────────────────────────────


def test_fuzzy_name_match_threshold() -> None:
    assert grading.similarity("Brochette de chèvre", "brochette de chevre") == 1.0
    assert (
        grading.similarity("Isombe na umuceri", "Isombe na umuceli") >= 0.9
    )  # one typo
    assert (
        grading.similarity("Chips", "Chips (frites)") < 0.9
    )  # extra words: not a match


def test_match_names_is_one_to_one_best_first() -> None:
    pairs = grading.match_names(["Fanta", "Fanta 50cl"], ["Fanta 50cl"])
    assert pairs == {1: 0}


@pytest.mark.parametrize(
    ("text", "numbers"),
    [
        ("1,500 RWF", [D(1500)]),
        ("1 500 Frw", [D(1500)]),
        ("2.5 kg and 2,5 l", [D("2.5"), D("2.5")]),
        ("as of 14:05 on 2026-11-18 you sold 20", [D(20)]),
        ("no numbers", []),
    ],
)
def test_extract_numbers(text: str, numbers: list[Decimal]) -> None:
    assert grading.extract_numbers(text) == numbers


def test_invented_numbers_allows_turn_and_kitchen_numbers() -> None:
    allowed = [D(500), D(20)]
    assert grading.invented_numbers("You have 500 kg; recording 20.", allowed) == []
    assert grading.invented_numbers("You have about 35 kg of salt.", allowed) == [D(35)]


@pytest.mark.parametrize(
    ("text", "lang"),
    [
        ("How many portions of Chips did you sell today?", "en"),
        ("Combien de portions de Chips avez-vous vendues aujourd'hui ?", "fr"),
        ("Ni amasahani angahe ya Chips mwagurishije uyu munsi?", "rw"),
        ("Chips 20", "unknown"),
    ],
)
def test_detect_language(text: str, lang: str) -> None:
    assert grading.detect_language(text) == lang


# ── classify ──────────────────────────────────────────────────────────────────


def test_classify_exact_label_and_unavailable_is_wrong() -> None:
    assert grading.grade_classify(
        "menu", {"status": "ok", "kind": "menu", "confidence": 0.9}
    )["correct"]
    assert not grading.grade_classify(
        "menu", {"status": "ok", "kind": "dish", "confidence": 0.9}
    )["correct"]
    unavailable = grading.grade_classify(
        "menu", {"status": "classify_unavailable", "kind": None}
    )
    assert unavailable["unavailable"]
    assert not unavailable["correct"]


def test_calibration_perfect_and_overconfident() -> None:
    perfect = grading.calibration([(1.0, True), (0.0, False)])
    assert perfect["brier"] == 0.0
    assert perfect["ece"] == 0.0
    over = grading.calibration([(0.95, False), (0.95, False)])
    assert over["ece"] == pytest.approx(0.95)


# ── menu / dish / document ────────────────────────────────────────────────────


def test_menu_grading_name_price_category() -> None:
    expected = [
        {"name": "Brochette de chèvre", "price": 2500, "category": "main"},
        {"name": "Fanta 50cl", "price": 1000, "category": "drink"},
        {"name": "Isombe", "price": None, "category": None},
    ]
    body = {
        "items": [
            {"name": "Brochette de chevre", "price": 2500, "category": "main"},
            {"name": "Fanta 50cl", "price": 1500, "category": "drink"},
            {"name": "Tilapia", "price": 6000, "category": "main"},
        ]
    }
    g = grading.grade_menu(expected, body)
    assert g["recall"] == pytest.approx(2 / 3)
    assert g["precision"] == pytest.approx(2 / 3)
    assert g["price_accuracy"] == pytest.approx(
        1 / 3
    )  # Fanta price wrong, Isombe missed
    assert g["category_accuracy"] == 1.0  # both expected categories right
    assert g["missed"] == ["Isombe"]
    assert grading.grade_menu(expected, None) == {"valid": False}


def test_dish_grading_uses_kitchen_names_for_linked_ingredients() -> None:
    kitchen = {"id-potato": "Potato", "id-oil": "Cooking oil"}
    body = {
        "ingredients": [
            {"name": "Potatoes", "ingredient_id": "id-potato"},
            {"name": "Salt", "ingredient_id": None},
            {"name": "Mayonnaise", "ingredient_id": None},
        ]
    }
    g = grading.grade_dish(["Potato", "Cooking oil", "Salt"], body, kitchen)
    assert g["precision"] == pytest.approx(2 / 3)
    assert g["recall"] == pytest.approx(2 / 3)
    assert g["link_rate"] == pytest.approx(1 / 2)  # potato linked, oil not suggested
    assert g["missed"] == ["Cooking oil"]


def test_document_grading_quantity_and_prices() -> None:
    expected = [
        {
            "name": "Tomatoes",
            "quantity": 25,
            "unit": "kg",
            "unit_price": 1000,
            "line_total": 25000,
        },
        {
            "name": "Onions",
            "quantity": 10,
            "unit": "kg",
            "unit_price": None,
            "line_total": None,
        },
    ]
    body = {
        "lines": [
            {
                "name": "Tomatoes",
                "quantity": "25",
                "unit": "kg",
                "unit_price": 1000,
                "line_total": 25000,
            },
            {
                "name": "Onions",
                "quantity": "12",
                "unit": "kg",
                "unit_price": None,
                "line_total": None,
            },
        ]
    }
    g = grading.grade_document(expected, body)
    assert g["line_recall"] == 1.0
    assert g["quantity_accuracy"] == pytest.approx(0.5)
    assert g["price_accuracy"] == 1.0  # only Tomatoes has expected prices


# ── assistant ─────────────────────────────────────────────────────────────────


def _always_valid(action: str, params: dict) -> bool:
    return True


def test_assistant_proposal_passes_all_checks() -> None:
    case = {
        "language": "en",
        "turns": ["Record 12 chips sold today"],
        "expect": {
            "type": "proposal",
            "action_type": "record_sale",
            "params": {"menu_item_name": "Chips", "portions_sold": 12},
        },
    }
    body = {
        "reply_text": "I'll record 12 portions of Chips sold today. Please confirm.",
        "proposal": {
            "action_type": "record_sale",
            "params": {"menu_item_name": "Chips", "portions_sold": 12},
        },
    }
    g = grading.grade_assistant(
        case,
        body,
        http_status=200,
        error_code=None,
        allowed_numbers=[D(12)],
        params_validator=_always_valid,
    )
    assert g["passed"], g["checks"]


def test_assistant_clarification_needs_one_question_in_request_language() -> None:
    case = {
        "language": "fr",
        "turns": ["Enregistre des Chips"],
        "expect": {"type": "clarification"},
    }
    ok = {
        "reply_text": "Je dois savoir le nombre de portions.",
        "clarification": {"question": "Combien de portions avez-vous vendues ?"},
    }
    two = {
        "reply_text": "Je dois savoir.",
        "clarification": {"question": "Combien ? Et quel jour ?"},
    }
    english = {
        "reply_text": "I need to know how many.",
        "clarification": {"question": "How many portions did you sell?"},
    }
    kw = {
        "http_status": 200,
        "error_code": None,
        "allowed_numbers": [],
        "params_validator": _always_valid,
    }
    assert grading.grade_assistant(case, ok, **kw)["passed"]
    assert not grading.grade_assistant(case, two, **kw)["checks"]["one_question"]
    assert grading.grade_assistant(case, english, **kw)["checks"]["language"] is False


def test_assistant_no_data_answer_must_not_invent_numbers() -> None:
    case = {
        "language": "en",
        "turns": ["How much salt do we have?"],
        "expect": {"type": "answer", "no_data": True},
    }
    kw = {
        "http_status": 200,
        "error_code": None,
        "allowed_numbers": [D(500)],
        "params_validator": _always_valid,
    }
    honest = {
        "reply_text": "I don't have salt in your stock data, so I can't say how much you have."
    }
    invented = {"reply_text": "You have about 3 kg of salt left in the kitchen."}
    assert grading.grade_assistant(case, honest, **kw)["checks"]["grounded"]
    g = grading.grade_assistant(case, invented, **kw)
    assert not g["passed"]
    assert g["invented_numbers"] == ["3"]


def test_assistant_out_of_domain_refusal_passes() -> None:
    case = {
        "language": "en",
        "turns": ["Write me a poem"],
        "expect": {"type": "answer", "out_of_domain": True},
    }
    g = grading.grade_assistant(
        case,
        None,
        http_status=422,
        error_code="AI_REFUSED",
        allowed_numbers=[],
        params_validator=_always_valid,
    )
    assert g["passed"]


def test_assistant_invalid_params_fail() -> None:
    case = {
        "language": "en",
        "turns": ["x"],
        "expect": {"type": "proposal", "action_type": "record_sale", "params": {}},
    }
    body = {
        "reply_text": "Record it?",
        "proposal": {"action_type": "record_sale", "params": {"portions_sold": "many"}},
    }
    g = grading.grade_assistant(
        case,
        body,
        http_status=200,
        error_code=None,
        allowed_numbers=[],
        params_validator=lambda a, p: False,
    )
    assert g["checks"]["params_valid"] is False
    assert not g["passed"]


# ── unreadable values are left out of scoring ───────────────────────


def test_menu_skips_unreadable_names_and_prices() -> None:
    expected = [
        {"name": "Tea", "price": "unreadable", "category": "drink"},
        {"name": "Latte", "price": "unreadable", "category": "drink"},
        {"name": "Mocha", "price": 2000, "category": "drink"},
        {"name": "unreadable", "price": "unreadable", "category": None},
    ]
    body = {
        "items": [
            {"name": "Tea", "price": 1500, "category": "drink"},
            {"name": "Latte", "price": None, "category": "drink"},
            {"name": "Mocha", "price": 2000, "category": "drink"},
            {
                "name": "Sahlep",
                "price": 2500,
                "category": "drink",
            },  # what the reviewer could not read
        ]
    }
    g = grading.grade_menu(expected, body)
    assert g["recall"] == 1.0  # the unreadable entry is not expected to be found
    assert g["precision"] == 1.0  # Sahlep is not held against precision
    assert g["price_accuracy"] == 1.0  # only Mocha's price is graded
    assert g["unreadable_expected"] == 1


def test_document_skips_unreadable_quantity_and_totals() -> None:
    expected = [
        {
            "name": "Adan oil",
            "quantity": "unreadable",
            "unit_price": 2150,
            "line_total": 8600,
        },
        {
            "name": "Hot Sauce",
            "quantity": 1,
            "unit_price": None,
            "line_total": "unreadable",
        },
    ]
    body = {
        "lines": [
            {
                "name": "Adan oil",
                "quantity": "6",
                "unit_price": 2150,
                "line_total": 8600,
            },
            {
                "name": "Hot Sauce",
                "quantity": "1",
                "unit_price": None,
                "line_total": None,
            },
        ]
    }
    g = grading.grade_document(expected, body)
    assert g["quantity_accuracy"] == 1.0  # oil quantity not graded
    assert g["price_accuracy"] == 1.0  # Hot Sauce has no gradable price
    assert g["line_recall"] == 1.0


def test_gradable() -> None:
    assert grading.gradable(0)
    assert grading.gradable(None)
    assert not grading.gradable("unreadable")
    assert grading.gradable("non_rwf")  # other currencies are scored, never skipped
