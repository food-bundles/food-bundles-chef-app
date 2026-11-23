"""Step 2a build step 4: price parser, unit registry, document arithmetic, number words."""

from __future__ import annotations

from decimal import Decimal

import pytest
from app.shared.document_check import DocLine, check_document, classify_line
from app.shared.number_words import parse_amount_words
from app.shared.price_parser import (
    DOLLAR_CURRENCIES,
    SHILLING_CURRENCIES,
    PriceHints,
    infer_decimal_separator,
    parse_price,
)
from app.shared.units import convert, parse_unit

D = Decimal
RW = PriceHints(kitchen_currency="RWF", country="RW")
FR = PriceHints(kitchen_currency="EUR", country="FR")
US = PriceHints(kitchen_currency="USD", country="US")
KE = PriceHints(kitchen_currency="KES", country="KE")
NG = PriceHints(kitchen_currency="NGN", country="NG")
NONE = PriceHints()

# (printed, hints, status, amount, currency, amount candidates, currency candidates, flags)
PRICE_CASES = [
    ("12,000 Rwf", NONE, "ok", "12000", "RWF", [], [], []),
    ("Frw 1,500", NONE, "ok", "1500", "RWF", [], [], []),
    # One separator + 3 digits, nothing to decide: ambiguous, both readings offered.
    (
        "1.500",
        NONE,
        "ambiguous",
        None,
        None,
        ["1500", "1.5"],
        [],
        ["ambiguous_separator", "no_currency"],
    ),
    (
        "1,500",
        NONE,
        "ambiguous",
        None,
        None,
        ["1500", "1.5"],
        [],
        ["ambiguous_separator", "no_currency"],
    ),
    # No currency printed, kitchen currency without decimals (RWF): 1.5 RWF does not exist.
    ("1.500", RW, "ok", "1500", None, [], [], ["no_currency"]),
    ("1,500", RW, "ok", "1500", None, [], [], ["no_currency"]),
    # No currency printed in a EUR kitchen: 1.50 EUR exists, so ask. The country (FR, ","
    # decimals) only orders the options: the French reading is offered first.
    (
        "1.500",
        FR,
        "ambiguous",
        None,
        None,
        ["1500", "1.5"],
        [],
        ["ambiguous_separator", "no_currency"],
    ),
    (
        "1,500",
        FR,
        "ambiguous",
        None,
        None,
        ["1.5", "1500"],
        [],
        ["ambiguous_separator", "no_currency"],
    ),
    (
        "1,500",
        US,
        "ambiguous",
        None,
        None,
        ["1500", "1.5"],
        [],
        ["ambiguous_separator", "no_currency"],
    ),
    # A printed currency brings its own convention, in any kitchen.
    ("€1.500", FR, "ok", "1500", "EUR", [], [], []),
    (
        "$1,500",
        NONE,
        "ambiguous",
        "1500",
        None,
        [],
        list(DOLLAR_CURRENCIES),
        ["ambiguous_currency"],
    ),
    ("Ksh 1,500", NONE, "ok", "1500", "KES", [], [], []),
    # "$" with comma decimals: the amount is clear, the currency is not, so ask that.
    (
        "12,50 $",
        NONE,
        "ambiguous",
        "12.50",
        None,
        [],
        list(DOLLAR_CURRENCIES),
        ["ambiguous_currency"],
    ),
    # 3-decimal currencies keep both readings open.
    ("KWD 1.500", NONE, "ambiguous", None, "KWD", ["1500", "1.5"], [], ["ambiguous_separator"]),
    ("2.5k", NONE, "ok", "2500", None, [], [], ["k_suffix", "no_currency"]),
    ("2,5k", NONE, "ok", "2500", None, [], [], ["k_suffix", "no_currency"]),
    ("$7.99", NONE, "ambiguous", "7.99", None, [], list(DOLLAR_CURRENCIES), ["ambiguous_currency"]),
    ("$7.99", US, "ok", "7.99", "USD", [], [], []),
    ("7,99 €", NONE, "ok", "7.99", "EUR", [], [], []),
    ("€7,99", NONE, "ok", "7.99", "EUR", [], [], []),
    # The naira's own convention ("," groups, 2 decimals): 71,200 NGN in ANY kitchen.
    ("₦71,200", NONE, "ok", "71200", "NGN", [], [], []),
    ("₦71,200", RW, "ok", "71200", "NGN", [], [], []),
    ("₦71,200", FR, "ok", "71200", "NGN", [], [], []),
    ("₦71,200", NG, "ok", "71200", "NGN", [], [], []),
    ("71,200 N", NG, "ok", "71200", "NGN", [], [], []),
    ("7,99 €", RW, "ok", "7.99", "EUR", [], [], []),
    ("20$", NONE, "ambiguous", "20", None, [], list(DOLLAR_CURRENCIES), ["ambiguous_currency"]),
    ("USD 20", NONE, "ok", "20", "USD", [], [], []),
    ("20", NONE, "ok", "20", None, [], [], ["no_currency"]),
    ("1 200,50", NONE, "ok", "1200.50", None, [], [], ["no_currency"]),
    ("1'200.50", NONE, "ok", "1200.50", None, [], [], ["no_currency"]),
    ("Ksh 350", NONE, "ok", "350", "KES", [], [], []),
    (
        "350/-",
        NONE,
        "ambiguous",
        "350",
        None,
        [],
        list(SHILLING_CURRENCIES),
        ["ambiguous_currency"],
    ),
    ("350/-", KE, "ok", "350", "KES", [], [], []),
    ("UGX 12,000", NONE, "ok", "12000", "UGX", [], [], []),
    ("12.000,00", NONE, "ok", "12000.00", None, [], [], ["no_currency"]),
    ("1,200.50", NONE, "ok", "1200.50", None, [], [], ["no_currency"]),
    ("1.200.000", NONE, "ok", "1200000", None, [], [], ["no_currency"]),
    ("CHF 12.50", NONE, "ok", "12.50", "CHF", [], [], []),
    # Printed in a currency other than the kitchen's: read as printed (the policy then asks).
    ("€12", RW, "ok", "12", "EUR", [], [], []),
    # RWF has no cents: read as printed, flagged rather than rounded.
    ("1500.50 Rwf", NONE, "ok", "1500.50", "RWF", [], [], ["inexact_for_currency"]),
]


@pytest.mark.parametrize(
    ("text", "hints", "status", "amount", "currency", "amounts", "currencies", "flags"),
    PRICE_CASES,
    ids=[c[0] + ("" if c[1] is NONE else f" [{c[1].kitchen_currency}]") for c in PRICE_CASES],
)
def test_price_parser(
    text: str,
    hints: PriceHints,
    status: str,
    amount: str | None,
    currency: str | None,
    amounts: list[str],
    currencies: list[str],
    flags: list[str],
) -> None:
    reading = parse_price(text, hints)
    assert reading.status == status
    assert reading.amount == (D(amount) if amount is not None else None)
    assert reading.currency == currency
    assert reading.amount_candidates == [D(a) for a in amounts]
    assert reading.currency_candidates == currencies
    assert sorted(reading.flags) == sorted(flags)


@pytest.mark.parametrize(
    ("text", "kind", "amount"),
    [("free", "free", D(0)), ("Gratuit", "free", D(0)), ("MP", "market_price", None),
     ("market price", "market_price", None), ("Prix du marché", "market_price", None)],
)  # fmt: skip
def test_free_and_market_price_are_not_prices(text: str, kind: str, amount: Decimal | None) -> None:
    reading = parse_price(text, RW)
    assert reading.status == "no_price"
    assert reading.kind == kind
    assert reading.amount == amount


@pytest.mark.parametrize("text", ["", "   ", "see board", "20 or 30", "Rwf"])
def test_unreadable_prices_are_never_guessed(text: str) -> None:
    reading = parse_price(text, RW)
    assert reading.status == "unreadable"
    assert reading.amount is None


def test_document_separator_hint_decides_ambiguous_prices() -> None:
    assert infer_decimal_separator(["12.000,00", "1.500"]) == ","
    assert infer_decimal_separator(["1,200.50", "7.99"]) == "."
    assert infer_decimal_separator(["1.500", "2.000"]) is None  # nothing decisive
    assert infer_decimal_separator(["7,99", "1,200.50"]) is None  # contradictory
    # A document that writes 7,99 elsewhere: its "1.500" groups thousands.
    hints = PriceHints(decimal_separator=infer_decimal_separator(["7,99 €", "12,50 €"]))
    assert parse_price("1.500", hints).amount == D("1500")
    assert parse_price("1,500", hints).amount == D("1.5")


# ── Units ─────────────────────────────────────────────────────────────────────

UNIT_CASES = [
    ("2", "lb", "kg", "ok", "0.90718474"),
    ("16", "oz", "lb", "ok", "1"),
    ("500", "g", "kg", "ok", "0.5"),
    ("1.5", "kg", "g", "ok", "1500"),
    ("750", "ml", "l", "ok", "0.75"),
    ("2", "l", "ml", "ok", "2000"),
    ("3", "dozen", "piece", "ok", "36"),
    ("3", "Kgs", "kg", "ok", "3"),
    ("2", "US gallon", "l", "ok", "7.570823568"),
    ("2", "UK gallon", "l", "ok", "9.09218"),
    ("1", "gallon", "l", "ask", None),
    ("8", "fl oz", "ml", "ask", None),
    ("8", "US fl oz", "ml", "ok", "236.5882365"),
    ("2", "50 kg bag", "kg", "ok", "100"),
    ("2", "bag of 25kg", "kg", "ok", "50"),
    ("3", "carton of 24", "piece", "ok", "72"),
    ("3", "1 carton (24 pcs)", "piece", "ok", "72"),
    ("2", "bag", "kg", "ask", None),
    ("1", "crate", "kg", "ask", None),
    ("4", "sack", "sack", "ok", "4"),
    ("10", "360grm", "g", "ok", "3600"),
    ("1", "kg", "piece", "incompatible", None),
]


@pytest.mark.parametrize(("qty", "unit", "target", "status", "expected"), UNIT_CASES)
def test_unit_conversion(
    qty: str, unit: str, target: str, status: str, expected: str | None
) -> None:
    result = convert(D(qty), unit, target)
    assert result.status == status
    assert result.original_qty == D(qty)  # the original is always kept
    assert result.original_unit == unit
    if expected is None:
        assert result.qty is None
    else:
        assert result.qty == D(expected)


def test_questions_say_what_to_ask() -> None:
    assert convert(D("1"), "gallon", "l").question == "us_or_uk"
    assert convert(D("1"), "bag", "kg").question == "pack_size"
    # The ingredient's own pack size answers it.
    assert convert(D("2"), "bag", "kg", pack_size=(D("50"), "kg")).qty == D("100")


def test_parse_unit_keeps_the_printed_text() -> None:
    parsed = parse_unit("50 kg bag")
    assert (parsed.unit, parsed.pack_qty, parsed.pack_unit, parsed.text) == (
        "bag",
        D(50),
        "kg",
        "50 kg bag",
    )
    assert parse_unit("1 carton").pack_qty is None  # a leading count is not a size
    assert parse_unit("imp. pint").measure == "uk"


# ── Number words ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("words", "expected"),
    [
        ("Seventy one thousand two hundred naira only", "71200"),
        ("one thousand two hundred and fifty", "1250"),
        ("Twenty-five dollars and fifty cents", "25.50"),
        ("mille deux cent cinquante francs", "1250"),
        ("soixante et onze mille deux cents", "71200"),
        ("quatre-vingt-dix-sept", "97"),
        ("deux millions cinq cent mille francs rwandais", "2500000"),
        ("cent", "100"),
    ],
)
def test_amount_words(words: str, expected: str) -> None:
    assert parse_amount_words(words) == D(expected)


@pytest.mark.parametrize("words", ["", "seventy one thousand and something", "see over", "N/A"])
def test_unreadable_words_return_none(words: str) -> None:
    assert parse_amount_words(words) is None


# ── Documents ─────────────────────────────────────────────────────────────────


def test_line_labels_are_classified() -> None:
    assert [classify_line(x) for x in ["SUBTOTAL", "Sous-total", "TAX", "TVA 18%", "Service charge",
            "Remise", "Tip", "Delivery fee", "Deposit", "CASH", "CHANGE", "Rounding",
            "TOTAL", "Net à payer", "Fiesta Potatoes"]] == [
        "subtotal", "subtotal", "tax", "tax", "service", "discount", "tip", "delivery",
        "deposit", "cash", "change", "rounding", "total", "total", "item",
    ]  # fmt: skip


def test_fast_food_receipt_with_cash_and_change_balances() -> None:
    """Subtotal / tax / total / cash / change: cash and change stay out of the total."""
    lines = [
        DocLine("Crunchwrap Supreme", D(1), None, D("4.99")),
        DocLine("Fiesta Potatoes", D(2), D("2.39"), D("4.78")),
        DocLine("No Sour Cream", D(2), None, D("0.00")),
        DocLine("Cheesy Rollup", D(2), D("1.00"), D("2.00")),
        DocLine("Cinnamon Twist", D(1), None, D("1.00")),
        DocLine("Chzy Bean Rice Bur", D(1), None, D("1.00")),
        DocLine("Lg Blast Freeze", D(1), None, D("2.99")),
        DocLine("Hot Sauce", D(1), None, D("0.00")),
        DocLine("SUBTOTAL", line_total=D("16.76")),
        DocLine("TAX", line_total=D("1.43")),
        DocLine("TOTAL", line_total=D("18.19")),
        DocLine("CASH", line_total=D("20.00")),
        DocLine("CHANGE", line_total=D("1.81")),
    ]
    result = check_document(lines, "USD")
    assert result.status == "ok", result.issues
    assert result.items_sum == D("16.76")
    assert result.tax_included is False
    assert result.kinds.count("item") == 8


def test_handwritten_invoice_flags_the_wrong_line_and_checks_the_words() -> None:
    """6 x 2,150 = 12,900, but 8,600 is written: flagged, not corrected. The lines add up
    to the printed 71,200, which the total in words confirms."""
    lines = [
        DocLine("Rice", D(1), D(16000), D(16000)),
        DocLine("Oloyin Bean", D("0.5"), D(13000), D(13000)),
        DocLine("Adan oil", D(6), D(2150), D(8600)),
        DocLine("Dano refill", D(10), D(600), D(6000)),
        DocLine("Milo Tin", D(8), D(1100), D(8800)),
        DocLine("Dry Fish", D(8), D(1100), D(8800)),
        DocLine("Titus", D(50), D(200), D(10000)),
        DocLine("Total", line_total=D(71200)),
    ]
    result = check_document(
        lines, "NGN", total_in_words="Seventy one thousand two hundred naira only"
    )
    assert result.status == "mismatch"
    flagged = {i.label: i for i in result.issues if i.kind == "line_arithmetic"}
    assert flagged["Adan oil"].expected == D(12900)
    assert flagged["Adan oil"].printed == D(8600)
    assert flagged["Adan oil"].line_index == 2
    assert "Oloyin Bean" in flagged  # ½ x 13,000 ≠ 13,000 (as written): flagged too
    assert {i.kind for i in result.issues} == {"line_arithmetic"}  # total and words agree
    assert result.items_sum == D(71200)
    assert lines[2].line_total == D(8600)  # nothing corrected

    wrong_words = check_document(lines, "NGN", total_in_words="seventy thousand naira only")
    assert any(i.kind == "words_mismatch" for i in wrong_words.issues)
    unreadable = check_document(lines, "NGN", total_in_words="seventy one thou… (smudged)")
    assert "words_unreadable" in unreadable.skipped
    assert not any(i.kind == "words_mismatch" for i in unreadable.issues)


def test_delivery_note_without_prices_is_not_applicable() -> None:
    lines = [DocLine("Tomatoes", D(6), None, None), DocLine("Onions", D(12), None, None)]
    assert check_document(lines, "RWF").status == "not_applicable"


def test_tolerances_ignore_printed_rounding_but_catch_real_errors() -> None:
    within_line = [
        DocLine("Oil", D(3), D("3.333"), D("10.00")),
        DocLine("Total", line_total=D("10.00")),
    ]
    assert check_document(within_line, "EUR").status == "ok"  # 9.999: within 1 cent
    off_total = [DocLine("Rice", D(1), D(1000), D(1000)), DocLine("Total", line_total=D(1004))]
    assert check_document(off_total, "RWF").status == "ok"  # 0.4 % of the total
    wrong_total = [DocLine("Rice", D(1), D(1000), D(1000)), DocLine("Total", line_total=D(1100))]
    issue = check_document(wrong_total, "RWF").issues[0]
    assert (issue.kind, issue.expected, issue.printed) == ("total_mismatch", D(1000), D(1100))


def test_vat_included_discounts_and_fees() -> None:
    included = [
        DocLine("Brochette", D(2), D(3500), D(7000)),
        DocLine("TVA 18% incluse", line_total=D(1068)),
        DocLine("Total TTC", line_total=D(7000)),
    ]
    result = check_document(included, "RWF")
    assert result.status == "ok"
    assert result.tax_included is True
    fees = [
        DocLine("Pizza", D(2), D("9.50"), D("19.00")),
        DocLine("Sous-total", line_total=D("19.00")),
        DocLine("Livraison", line_total=D("2.50")),
        DocLine("Pourboire", line_total=D("1.00")),
        DocLine("Remise", line_total=D("-3.00")),
        DocLine("Arrondi", line_total=D("0.01")),
        DocLine("Total", line_total=D("19.51")),
        DocLine("Espèces", line_total=D("20.00")),
        DocLine("Monnaie rendue", line_total=D("0.49")),
    ]
    assert check_document(fees, "EUR").status == "ok"
