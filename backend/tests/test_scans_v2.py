"""Step 2a build step 5: v2 scans, the server-side clarification policy and the resolve
endpoints. The model's rows are given directly (no model call): the server reads prices,
units and arithmetic deterministically and decides which question to ask."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from app.core import config as cfg
from app.core.security import create_access_token
from app.modules.ai.clarifications import ScanAnswers, ScanContext
from app.modules.ai.gateway.scans import build_document, build_menu
from app.modules.ai.schemas.gateway import ModelDocumentExtractionV2, ModelMenuItemV2
from app.modules.chefs.models import Chef
from app.modules.exchange_rates.service import Rate
from httpx import AsyncClient
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession

D = Decimal
RW = ScanContext("RWF", "RW", conversion_enabled=True)
FR = ScanContext("EUR", "FR", conversion_enabled=True)
US = ScanContext("USD", "US", conversion_enabled=True)
_PHONE = [0]


def _usd_rwf() -> Rate:
    # The TABLE rate (1 USD = 1477.34 RWF), not anything printed on a menu.
    return Rate(
        "USD", "RWF", D("1477.34"), date(2026, 11, 18), "frankfurter", False, D("1477.34"), D(1)
    )


def rates(table: dict[str, Rate | None]) -> Any:
    async def rate_for(code: str) -> Rate | None:
        return table.get(code)

    return rate_for


def item(name: str, text: str | None, amount: str | None = None, currency: str | None = None):
    price = None
    if text is not None:
        price = {"text": text, "amount": amount, "currency": currency, "confidence": 0.9}
    return ModelMenuItemV2.model_validate({"name": name, "price": price, "name_confidence": 0.9})


async def menu(
    rows: list[ModelMenuItemV2],
    ctx: ScanContext,
    answers: dict | None = None,
    table: dict[str, Rate | None] | None = None,
):
    return await build_menu(
        rows,
        kind="menu",
        image_quality="ok",
        ctx=ctx,
        answers=ScanAnswers.model_validate(answers or {}),
        rate_for=rates(table or {}),
        request_id="req-12345678",
        prompt_version="menu_extract.v2",
    )


# ── Menu: currency questions ──────────────────────────────────────────────────


async def test_no_currency_is_asked_once_per_scan_with_kitchen_currency_preselected() -> None:
    rows = [item("Chips", "1500"), item("Fanta", "1,000"), item("Tea", "500")]
    result = await menu(rows, RW)
    assert len(result.clarifications) == 1
    question = result.clarifications[0]
    assert (question.kind, question.key, question.preselected) == (
        "currency_missing",
        "currency",
        "RWF",
    )
    assert question.targets == [0, 1, 2]
    assert question.options[0].value == "RWF"
    assert question.options[-1].input == "currency"
    assert all(i.price_money is None for i in result.items)
    assert all(i.price_status == "needs_answer" for i in result.items)

    done = await menu(rows, RW, {"currency": "RWF"})
    assert done.clarifications == []
    assert [(i.price, i.price_money.amount if i.price_money else None) for i in done.items] == [
        (1500, "1500"),
        (1000, "1000"),
        (500, "500"),
    ]


async def test_the_question_with_most_rows_comes_first() -> None:
    rows = [item("A", "2.5k Frw"), item("B", "1500"), item("C", "700"), item("D", "900")]
    result = await menu(rows, RW)
    assert [c.kind for c in result.clarifications] == ["currency_missing", "k_suffix"]
    assert result.clarifications[0].targets == [1, 2, 3]


async def test_k_suffix_confirmed_once_then_applied_to_every_k_price() -> None:
    rows = [item("A", "Frw 2.5k"), item("B", "Frw 3k")]
    first = await menu(rows, RW)
    assert [c.kind for c in first.clarifications] == ["k_suffix"]
    assert first.clarifications[0].params == {"example": "Frw 2.5k", "amount": "2500"}
    yes = await menu(rows, RW, {"k_suffix": "yes"})
    assert [i.price for i in yes.items] == [2500, 3000]
    no = await menu(rows, RW, {"k_suffix": "no"})
    assert [i.price_status for i in no.items] == ["unreadable", "unreadable"]
    assert {c.kind for c in no.clarifications} == {"unreadable_value"}


async def test_dollar_sign_offers_the_dollar_currencies() -> None:
    result = await menu([item("Burger", "$7.99")], RW)
    question = result.clarifications[0]
    assert question.question_key == "clarify.currency_ambiguous.question"
    values = [o.value for o in question.options]
    assert values[0] == "RWF"
    assert "USD" in values
    assert "CAD" in values


async def test_currency_mismatch_converts_at_the_table_rate_never_the_printed_one() -> None:
    """AI-never-supplies-a-rate test 4: the menu prints "1 USD = 1,000 RWF"; the model
    lists it; the server never reads it as a rate. Conversion uses the rates table."""
    rows = [
        item("Burger", "USD 5", amount="5", currency="USD"),
        item("1 USD = 1,000 RWF", "1 USD = 1,000 RWF", amount="1000", currency="RWF"),
    ]
    table = {"USD": _usd_rwf()}
    first = await menu(rows, RW, table=table)
    mismatch = next(c for c in first.clarifications if c.kind == "currency_mismatch")
    convert = mismatch.options[0]
    assert convert.value == "convert"
    assert not convert.disabled
    assert convert.params == {"from": "USD", "to": "RWF", "rate": "1477.34", "date": "2026-11-18"}
    assert {o.value for o in mismatch.options} == {"convert", "change_currency", "skip"}
    # The printed rate line is not a price at all (two numbers): unreadable, never a rate.
    assert first.items[1].price_status == "unreadable"

    done = await menu(
        rows, RW, {"mismatch": "convert", "rows": {"unreadable:1": "skip"}}, table=table
    )
    burger = done.items[0]
    # 5 x 1477.34 = 7386.70, half-even to whole RWF = 7387.
    assert burger.price == 7387
    assert burger.price_original is not None
    assert (burger.price_original.amount, burger.price_original.currency) == ("5.00", "USD")
    assert burger.price_rate is not None
    assert burger.price_rate.rate == "1477.34"
    assert done.items[1].price is None
    assert done.items[1].price_status == "skipped"
    assert done.clarifications == []


async def test_convert_option_disabled_without_rate_or_when_conversion_is_off() -> None:
    rows = [item("Burger", "USD 5")]
    no_rate = await menu(rows, RW, table={"USD": None})
    convert = no_rate.clarifications[0].options[0]
    assert convert.disabled
    assert convert.disabled_reason_key == "clarify.reason.rate_unavailable"
    off = ScanContext("EUR", "FR", conversion_enabled=False)
    gated = await menu(rows, off, table={"USD": _usd_rwf()})
    convert = gated.clarifications[0].options[0]
    assert convert.disabled
    assert convert.disabled_reason_key == "clarify.reason.conversion_off"
    # "convert" sent anyway while off: nothing is converted, the question stays.
    still = await menu(rows, off, {"mismatch": "convert"}, table={"USD": _usd_rwf()})
    assert still.items[0].price_money is None
    assert still.clarifications[0].kind == "currency_mismatch"


async def test_skip_imports_without_the_foreign_prices() -> None:
    result = await menu(
        [item("Burger", "USD 5"), item("Chips", "Frw 1,500")], RW, {"mismatch": "skip"}
    )
    assert [i.price for i in result.items] == [None, 1500]
    assert result.items[0].price_status == "skipped"


# ── Menu: separators and cross-checks ─────────────────────────────────────────


async def test_ambiguous_separator_asked_once_in_a_eur_kitchen() -> None:
    rows = [item("Steak", "1.500"), item("Wine", "2.500")]
    first = await menu(rows, FR, {"currency": "EUR"})
    question = first.clarifications[0]
    assert question.kind == "ambiguous_separator"
    assert question.targets == [0, 1]
    # Option values are the DECIMAL separator: "," reads 1.500 as 1500; "." as 1.5.
    assert [(o.value, o.params["amount"]) for o in question.options] == [
        (",", "1500"),
        (".", "1.5"),
    ]
    thousands = await menu(rows, FR, {"currency": "EUR", "decimal_separator": ","})
    assert [i.price_money.amount for i in thousands.items if i.price_money] == [
        "1500.00",
        "2500.00",
    ]


async def test_naira_menu_in_any_kitchen_needs_no_separator_question() -> None:
    result = await menu([item("Jollof", "₦71,200", amount="71200", currency="NGN")], FR)
    assert [c.kind for c in result.clarifications] == ["currency_mismatch"]


async def test_model_disagreement_is_asked_not_picked() -> None:
    result = await menu([item("Fanta", "Frw 1,000", amount="10000", currency="RWF")], RW)
    question = result.clarifications[0]
    assert question.kind == "unreadable_value"
    assert question.options[0].value == "keep"
    assert question.options[0].params == {"amount": "1000"}
    assert result.items[0].price_confidence <= 0.4
    kept = await menu(
        [item("Fanta", "Frw 1,000", amount="10000", currency="RWF")],
        RW,
        {"rows": {"unreadable:0": "keep"}},
    )
    assert kept.clarifications == []
    assert kept.items[0].price == 1000


async def test_nothing_to_ask_when_everything_is_clear() -> None:
    result = await menu([item("Croque", "7,99 €"), item("Café", "€2,50"), item("Eau", None)], FR)
    assert result.clarifications == []
    assert [i.price_money.amount if i.price_money else None for i in result.items] == [
        "7.99",
        "2.50",
        None,
    ]
    assert result.items[0].price is None  # legacy int field: not a whole amount


# ── Documents ─────────────────────────────────────────────────────────────────


def price(text: str) -> dict:
    return {"text": text, "confidence": 0.9}


def doc(lines: list[dict], words: str | None = None) -> ModelDocumentExtractionV2:
    return ModelDocumentExtractionV2.model_validate(
        {
            "kind": "receipt",
            "image_quality": "ok",
            "lines": [{"confidence": 0.9, **line} for line in lines],
            "total_in_words": words,
        }
    )


async def document(raw: ModelDocumentExtractionV2, ctx: ScanContext, answers: dict | None = None):
    return await build_document(
        raw,
        ctx=ctx,
        answers=ScanAnswers.model_validate(answers or {}),
        rate_for=rates({}),
        request_id="req-12345678",
        prompt_version="document_extract.v2",
        iso_date=None,
    )


HANDWRITTEN = [
    {
        "name": "Rice",
        "quantity_text": "10",
        "unit": "kg",
        "unit_price": price("1,500"),
        "line_total": price("15,000"),
    },
    {
        "name": "Oil",
        "quantity_text": "6",
        "unit": "l",
        "unit_price": price("2,150"),
        "line_total": price("8,600"),
    },
    {"name": "TOTAL", "line_total": price("Frw 23,600")},
]


async def test_line_arithmetic_is_flagged_never_corrected_and_words_cross_checked() -> None:
    result = await document(
        doc(HANDWRITTEN, words="Twenty three thousand six hundred francs"), RW, {"currency": "RWF"}
    )
    assert result.arithmetic is not None
    assert result.arithmetic.status == "mismatch"
    question = next(c for c in result.clarifications if c.kind == "arithmetic_mismatch")
    assert question.key == "arith:line_arithmetic:1"
    assert question.params["expected"] == "12900"
    assert question.params["printed"] == "8600"
    assert [o.value for o in question.options] == ["keep", "edit"]
    oil = result.lines[1]
    assert oil.line_total == 8600  # as printed
    assert [s.kind for s in result.summary] == ["total"]
    assert all(line.name != "TOTAL" for line in result.lines)
    assert "words_mismatch" not in [i.kind for i in result.arithmetic.issues]

    kept = await document(
        doc(HANDWRITTEN, words="Twenty three thousand six hundred francs"),
        RW,
        {"currency": "RWF", "rows": {"arith:line_arithmetic:1": "keep"}},
    )
    assert all(
        c.kind != "arithmetic_mismatch" or c.key != question.key for c in kept.clarifications
    )
    assert kept.arithmetic is not None  # still flagged
    assert kept.arithmetic.status == "mismatch"


async def test_delivery_note_without_prices_is_not_applicable() -> None:
    raw = doc(
        [
            {"name": "Tomatoes", "quantity_text": "25", "unit": "kg"},
            {"name": "Onions", "quantity_text": "10", "unit": "kg"},
        ]
    )
    result = await document(raw, RW)
    assert result.arithmetic is not None
    assert result.arithmetic.status == "not_applicable"
    assert result.clarifications == []
    assert [line.quantity for line in result.lines] == ["25", "10"]


async def test_imperial_units_convert_exactly_and_keep_the_printed_unit() -> None:
    raw = doc(
        [
            {
                "name": "Beef",
                "quantity_text": "3",
                "unit": "lbs",
                "unit_price": price("$2.00"),
                "line_total": price("$6.00"),
            }
        ]
    )
    result = await document(raw, US)
    beef = result.lines[0]
    assert (beef.quantity, beef.unit) == ("1.361", "kg")
    assert (beef.original_quantity, beef.original_unit) == ("3", "lbs")
    assert beef.unit_price_money is not None
    assert beef.unit_price_money.amount == "4.41"  # 6.00 / 1.361 kg, half-up to the cent
    assert beef.line_total_money is not None
    assert beef.line_total_money.amount == "6.00"
    assert result.arithmetic is not None  # 3 x 2.00 = 6.00
    assert result.arithmetic.status == "ok"


async def test_us_or_uk_gallon_and_unsized_packs_are_asked() -> None:
    raw = doc(
        [
            {"name": "Oil", "quantity_text": "1", "unit": "gal"},
            {"name": "Rice", "quantity_text": "2", "unit": "bags"},
            {"name": "Flour", "quantity_text": "1", "unit": "50 kg bag"},
        ]
    )
    result = await document(raw, US)
    asked = {c.key: c for c in result.clarifications}
    assert set(asked) == {"unit:0", "unit:1"}  # the printed 50 kg bag needs no question
    assert [o.value for o in asked["unit:0"].options] == ["us", "uk"]
    assert asked["unit:1"].options[0].input == "pack_size"
    assert (result.lines[2].quantity, result.lines[2].unit) == ("50", "kg")

    done = await document(raw, US, {"rows": {"unit:0": "uk", "unit:1": "50 kg"}})
    assert done.clarifications == []
    assert (done.lines[0].quantity, done.lines[0].unit) == ("4.54609", "l")
    assert (done.lines[1].quantity, done.lines[1].unit) == ("100", "kg")


async def test_unit_price_derived_from_line_total_when_not_printed() -> None:
    raw = doc(
        [
            {
                "name": "Tomatoes",
                "quantity_text": "25",
                "unit": "kg",
                "line_total": price("Frw 25,000"),
            }
        ]
    )
    result = await document(raw, RW)
    assert result.lines[0].unit_price == 1000
    assert result.clarifications == []


# ── Endpoints ─────────────────────────────────────────────────────────────────


async def _kitchen(
    client: AsyncClient, db: AsyncSession, currency: str, country: str
) -> tuple[str, dict]:
    _PHONE[0] += 1
    chef = Chef(phone_number=f"+2507832{_PHONE[0]:05d}", name="Scan Chef")
    db.add(chef)
    await db.flush()
    headers = {"Authorization": f"Bearer {create_access_token(str(chef.id))}"}
    resp = await client.post(
        "/api/v1/kitchens",
        json={"name": "K", "currency": currency, "timezone": "Africa/Kigali", "country": country},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"], headers


async def test_resolve_endpoints_reread_with_answers_and_no_model_call(
    client: AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(cfg.settings, "AI_ENABLED", True)
    monkeypatch.setattr(cfg.settings, "AI_MENU_SCAN_ENABLED", True)
    monkeypatch.setattr(cfg.settings, "AI_DOCUMENT_SCAN_ENABLED", True)
    # A routed provider must look configured (no call is made).
    monkeypatch.setattr(cfg.settings, "MODEL_API_KEY", SecretStr("meta-test-key"))
    monkeypatch.setattr(cfg.settings, "META_MUSE_SPARK_MODEL", "muse-spark-test")

    async def no_model(*args: Any, **kwargs: Any) -> Any:
        raise AssertionError("resolve must not call a model")

    monkeypatch.setattr("app.modules.ai.gateway.core.structured_call", no_model)
    kid, headers = await _kitchen(client, db, "RWF", "RW")
    base = f"/api/v1/kitchens/{kid}/ai"
    rows = [item("Chips", "1500").model_dump(), item("Fanta", "Frw 1,000").model_dump()]
    first = await client.post(
        f"{base}/menu-extract/resolve",
        headers=headers,
        json={"request_id": "req-12345678", "items": rows, "answers": {}},
    )
    assert first.status_code == 200, first.text
    assert [c["kind"] for c in first.json()["clarifications"]] == ["currency_missing"]
    assert first.json()["clarifications"][0]["question_key"] == "clarify.currency_missing.question"
    second = await client.post(
        f"{base}/menu-extract/resolve",
        headers=headers,
        json={"request_id": "req-12345678", "items": rows, "answers": {"currency": "RWF"}},
    )
    assert [i["price"] for i in second.json()["items"]] == [1500, 1000]
    assert second.json()["answers"]["currency"] == "RWF"

    bad = await client.post(
        f"{base}/menu-extract/resolve",
        headers=headers,
        json={"request_id": "req-12345678", "items": rows, "answers": {"exchange_rate": "1000"}},
    )
    assert bad.status_code == 422  # answers can't carry a rate either

    raw = doc(HANDWRITTEN).model_dump()
    resolved = await client.post(
        f"{base}/document-extract/resolve",
        headers=headers,
        json={"request_id": "req-12345678", "extraction": raw, "answers": {"currency": "RWF"}},
    )
    assert resolved.status_code == 200, resolved.text
    body = resolved.json()
    assert body["arithmetic"]["status"] == "mismatch"
    assert body["total"] == {"amount": "23600", "currency": "RWF"}


# ── What was read (for review screens and evals, Step 2a build step 7) ────────


async def test_price_read_shows_the_reading_before_any_question() -> None:
    rows = [item("Burger", "$7.99"), item("Fanta", "Frw 1,000"), item("Soup", None)]
    result = await menu(rows, FR)
    reads = [i.price_read.model_dump() if i.price_read else None for i in result.items]
    assert reads == [
        {"amount": "7.99", "currency": None},  # "$": the currency stays open
        {"amount": "1000", "currency": "RWF"},
        None,
    ]
    # Alone on its page (no other price shows the separator), "1.500" has two readings.
    alone = await menu([item("Steak", "1.500")], FR)
    assert alone.items[0].price_read is not None
    assert alone.items[0].price_read.model_dump() == {"amount": None, "currency": None}
    # With "7.99" on the same page, "." is the decimal separator: 1.5.
    shared = await menu([item("Burger", "$7.99"), item("Steak", "1.500")], FR)
    assert shared.items[1].price_read is not None
    assert shared.items[1].price_read.amount == "1.5"


async def test_price_read_keeps_the_printed_amount_after_conversion() -> None:
    table = {"USD": _usd_rwf()}
    done = await menu([item("Burger", "USD 5")], RW, {"mismatch": "convert"}, table=table)
    burger = done.items[0]
    assert burger.price == 7387
    assert burger.price_read is not None
    assert burger.price_read.model_dump() == {"amount": "5", "currency": "USD"}


async def test_document_total_read() -> None:
    result = await document(doc(HANDWRITTEN), RW)
    assert result.total_read is not None
    assert result.total_read.model_dump() == {"amount": "23600", "currency": "RWF"}
    assert result.lines[0].line_total_read is not None
    assert result.lines[0].line_total_read.model_dump() == {"amount": "15000", "currency": None}
