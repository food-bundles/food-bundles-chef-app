"""Commands domain rules with the mockup numbers (spec screens 05–08)."""

from __future__ import annotations

from decimal import Decimal

from app.domain import commands as rules

CHICKEN = rules.RecipeNeed("chicken", "Chicken", "kg", Decimal("0.3"))  # Chicken Legs: 0.3 kg
BOILO = [
    rules.RecipeNeed("chicken", "Chicken", "kg", Decimal("0.25")),
    rules.RecipeNeed("banana", "Cooking banana", "kg", Decimal("0.30")),
]


def test_spec_transitions_only() -> None:
    assert rules.can_transition("new", "cooking", "dine_in")
    assert rules.can_transition("new", "declined", "to_go")
    assert rules.can_transition("cooking", "served", "dine_in")
    assert rules.can_transition("cooking", "handed", "to_go")
    assert rules.can_transition("cooking", "cancelled", "dine_in")
    # Rejected:
    assert not rules.can_transition("new", "served", "dine_in")
    assert not rules.can_transition("new", "cancelled", "dine_in")
    assert not rules.can_transition("cooking", "declined", "dine_in")
    assert not rules.can_transition("cooking", "served", "to_go")  # To go is Handed
    assert not rules.can_transition("cooking", "handed", "dine_in")
    assert not rules.can_transition("served", "cancelled", "dine_in")
    assert not rules.can_transition("declined", "cooking", "dine_in")


def test_chef_records_straight_to_cooking_waiter_and_cashier_wait_as_new() -> None:
    roles = ["waiter", "cashier"]
    assert rules.initial_status("chef", roles) == "cooking"
    assert rules.initial_status("waiter", roles) == "new"
    assert rules.initial_status("cashier", roles) == "new"
    assert rules.initial_status("chef", roles, source="restaurant") == "new"


def test_can_make_is_the_scarcest_ingredient() -> None:
    stock = {"chicken": Decimal("1.9"), "banana": Decimal("8.4")}
    # Chicken 1.9 / 0.25 = 7.6 → 7; banana 8.4 / 0.30 = 28 → Boilo can make 7.
    assert rules.can_make(BOILO, stock) == 7
    assert rules.can_make([CHICKEN], {"chicken": Decimal("0.6")}) == 2
    assert rules.can_make([], stock) is None


def test_can_make_with_no_stock_is_zero() -> None:
    assert rules.can_make([CHICKEN], {}) == 0


def test_mockup_decline_need_09_have_06_short_03_accept_2_of_3() -> None:
    check = rules.stock_check([(3, [CHICKEN])], {"chicken": Decimal("0.6")})
    assert not check.enough
    (missing,) = check.missing
    assert (missing.need, missing.have, missing.short) == (
        Decimal("0.9"),
        Decimal("0.6"),
        Decimal("0.3"),
    )
    assert (check.max_portions, check.total_portions) == (2, 3)
    assert rules.decline_message(check.missing) == "Declined – not enough Chicken (short 0.3 kg)."


def test_enough_stock() -> None:
    check = rules.stock_check(
        [(2, BOILO), (1, [CHICKEN])], {"chicken": Decimal("1.9"), "banana": Decimal("8.4")}
    )
    assert check.enough
    assert check.max_portions == check.total_portions == 3


def test_done_status() -> None:
    assert rules.done_status("dine_in") == "served"
    assert rules.done_status("to_go") == "handed"
