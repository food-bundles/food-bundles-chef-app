"""Answer-key format 2 (Step 2a build step 7): money is amount + currency, clarifications are
scored as recall and false alarms, documents add totals and arithmetic flags."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evallib.grading import (  # noqa: E402
    grade_assistant,
    grade_clarifications,
    grade_document,
    grade_menu,
    money_ok,
)


def money(text: str, amount: str | None, currency: str | None) -> dict:
    return {"text": text, "amount": amount, "currency": currency}


def read(amount: str | None, currency: str | None) -> dict:
    return {"amount": amount, "currency": currency}


def test_amount_and_currency_must_both_match() -> None:
    assert money_ok(money("$7.99", "7.99", "USD"), read("7.99", "USD"))
    assert not money_ok(money("20$", "20", "USD"), read("20", "RWF"))  # 20$ read as 20 RWF
    assert not money_ok(money("7,99 €", "7.99", "EUR"), read("799", "EUR"))
    assert money_ok(money("12,000 Rwf", "12000", "RWF"), read("12000.00", "rwf"))


def test_open_currency_and_open_amount_mean_the_server_must_not_pick() -> None:
    # "$" alone: the amount is clear, the currency must stay open for the question.
    assert money_ok(money("20$", "20", None), read("20", None))
    assert not money_ok(money("20$", "20", None), read("20", "USD"))
    # "1.500" with nothing to decide: any settled amount is a guess.
    assert money_ok(money("1.500", None, None), read(None, None))
    assert not money_ok(money("1.500", None, None), read("1500", None))


def test_menu_prices_use_the_reading_and_skip_unreadable() -> None:
    expected = [
        {"name": "Chicken Deluxe", "price": money("$7.99", "7.99", None), "category": "main"},
        {"name": "Fanta", "price": money("Frw 1,000", "1000", "RWF")},
        {"name": "Mystery", "price": "unreadable"},
        {"name": "Carnitas", "price": None},
    ]
    body = {
        "items": [
            {"name": "Chicken Deluxe", "category": "main", "price": None, "price_read": read("7.99", None)},
            {"name": "Fanta", "price": 1000, "price_read": read("1000", "RWF")},
            {"name": "Mystery", "price": None, "price_read": read("5", "RWF")},
            {"name": "Carnitas", "price": None, "price_read": None},
        ],
        "clarifications": [{"kind": "currency_missing"}],
    }
    grade = grade_menu(expected, body, ["currency_missing"])
    assert grade["price_accuracy"] == 1.0  # 3 graded, "unreadable" left out
    assert grade["clarify"]["hits"] == ["currency_missing"]
    assert grade["clarify"]["false_alarms"] == []


def test_menu_guessing_a_number_is_a_miss() -> None:
    expected = [{"name": "Steak", "price": money("1.500", None, "EUR"), "should_clarify": ["ambiguous_separator"]}]
    guessed = {"items": [{"name": "Steak", "price_read": read("1500", "EUR")}], "clarifications": []}
    grade = grade_menu(expected, guessed, ["ambiguous_separator"])
    assert grade["price_accuracy"] == 0.0
    assert grade["clarify"]["missed"] == ["ambiguous_separator"]


def test_format_1_keys_still_grade_whole_rwf() -> None:
    grade = grade_menu([{"name": "Chips", "price": 1500}], {"items": [{"name": "Chips", "price": 1500}]})
    assert grade["price_accuracy"] == 1.0


def test_clarification_recall_and_false_alarms() -> None:
    result = grade_clarifications(
        ["currency_missing", "k_suffix"],
        {"clarifications": [{"kind": "k_suffix"}, {"kind": "unreadable_value"}]},
    )
    assert result["hits"] == ["k_suffix"]
    assert result["missed"] == ["currency_missing"]
    assert result["false_alarms"] == ["unreadable_value"]
    assert grade_clarifications([], {"clarifications": []})["false_alarms"] == []


def test_document_total_arithmetic_flags_and_printed_quantity() -> None:
    case = {
        "total": money("71,200", "71200", "NGN"),
        "arithmetic_flags": ["line_arithmetic"],
        "should_clarify": ["currency_mismatch", "arithmetic_mismatch"],
    }
    lines = [
        {"name": "Beef", "quantity": 3, "unit": "lbs", "unit_price": money("$2.00", "2.00", "USD")},
        {"name": "Oil", "quantity": 6, "unit_price": money("2,150", "2150", "NGN"), "line_total": money("8,600", "8600", "NGN")},
    ]
    body = {
        "lines": [
            {"name": "Beef", "quantity": "1.361", "original_quantity": "3", "unit_price_read": read("2.00", "USD")},
            {"name": "Oil", "quantity": "6", "unit_price_read": read("2150", "NGN"), "line_total_read": read("8600", "NGN")},
        ],
        "total_read": read("71200", "NGN"),
        "arithmetic": {"status": "mismatch", "issues": [{"kind": "line_arithmetic"}]},
        "clarifications": [{"kind": "currency_mismatch"}, {"kind": "arithmetic_mismatch"}],
    }
    grade = grade_document(lines, body, case)
    assert grade["quantity_accuracy"] == 1.0  # 3 lb as printed, not the converted 1.361 kg
    assert grade["price_accuracy"] == 1.0
    assert grade["total_ok"] is True
    assert grade["arithmetic"]["missed"] == []
    assert grade["arithmetic"]["false_flags"] == []
    assert grade["clarify"]["missed"] == []


def test_document_that_adds_up_must_raise_no_flag() -> None:
    body = {"lines": [], "arithmetic": {"status": "mismatch", "issues": [{"kind": "total_mismatch"}]}}
    grade = grade_document([], body, {"arithmetic_flags": []})
    assert grade["arithmetic"]["false_flags"] == ["total_mismatch"]


def test_assistant_checks_the_server_question_kind() -> None:
    case = {
        "language": "en",
        "turns": ["Add chapati for 2.5k"],
        "expect": {"type": "clarification", "clarify_kind": "k_suffix"},
    }
    body = {"reply_text": "Here is what I understood.", "clarification": {"question": "I need one detail.", "kind": "k_suffix"}}
    grade = grade_assistant(case, body, http_status=200, error_code=None, allowed_numbers=set(), params_validator=lambda a, p: True)
    assert grade["checks"]["clarify_kind"] is True
    wrong = {**body, "clarification": {"question": "Which?", "kind": "currency_missing"}}
    grade = grade_assistant(case, wrong, http_status=200, error_code=None, allowed_numbers=set(), params_validator=lambda a, p: True)
    assert grade["checks"]["clarify_kind"] is False
