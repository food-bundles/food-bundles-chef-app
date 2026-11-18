"""Unit tests for the eval scoring helpers (run: python -m pytest ai-evals/tests)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from evallib.metrics import (  # noqa: E402
    match_items,
    names_match,
    normalise,
    params_match,
    percentile,
    rate,
    word_error_rate,
)


def test_normalise_strips_accents_case_and_punctuation():
    assert normalise("Bœuf  Brochette!") == "boeuf brochette"
    assert normalise("Riz aux haricots") == "riz aux haricots"


def test_names_match_ignores_plural_and_case():
    assert names_match("Tomatoes", "tomato")
    assert names_match("Chips", "chips")
    assert names_match("Irish potatoes", "Irish Potato")
    assert not names_match("Rice", "Beans")


def test_word_error_rate_hand_calculated():
    assert word_error_rate("twelve chips sold", "twelve chips sold") == 0.0
    # one substitution in three words
    assert abs(word_error_rate("twelve chips sold", "twelve chips told") - 1 / 3) < 1e-9
    # one deletion in four words
    assert abs(word_error_rate("record twelve chips today", "record twelve chips") - 0.25) < 1e-9
    assert word_error_rate("", "") == 0.0
    assert word_error_rate("", "noise") == 1.0


def test_percentile_nearest_rank():
    values = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]
    assert percentile(values, 50) == 500
    assert percentile(values, 95) == 1000
    assert percentile([], 95) is None


def test_rate_handles_zero_total():
    assert rate(0, 0) is None
    assert rate(3, 4) == 0.75


def test_match_items_is_one_to_one():
    pairs = match_items(["Chips", "Rice and beans"], ["chips", "Chips", "Rice & beans"])
    assert pairs == {"Chips": "chips", "Rice and beans": "Rice & beans"}


def test_params_match_numbers_strings_and_contains():
    assert params_match({"portions_sold": 12, "menu_item_name": "Chips"}, {"portions_sold": "12", "menu_item_name": "chips"}) == []
    assert params_match({"quantity": 20}, {"quantity": "20.000"}) == []
    assert params_match({"name_contains": "mangue"}, {"name": "Jus de mangue"}) == []
    assert params_match({"change": "add"}, {"change": "set"}) == ["change"]
