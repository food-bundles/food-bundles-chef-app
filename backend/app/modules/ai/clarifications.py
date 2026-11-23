"""Clarifying questions for scans (Step 2a build step 5; design section 2d).

The SERVER decides when to ask, never the model, so both providers behave the same. Each
question is one short choice with tappable options; the app shows the first one, sends the
answer back (`ScanAnswers`) and gets the re-read result with the next question. Question and
option text are i18n keys plus parameters: nothing here is generated text.

Kinds, in the order used to break ties (the question affecting the most rows comes first):
currency_mismatch, currency_missing, ambiguous_separator, k_suffix, ambiguous_unit,
arithmetic_mismatch, unreadable_value. No other case asks.

Exchange rates come only from the rates table (ExchangeRateService); a rate printed on a
menu ("1 USD = 1,000 RWF") is never read or used.
"""

from __future__ import annotations

import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal

import structlog
from pydantic import BaseModel, ConfigDict, Field

from app.modules.exchange_rates.service import Rate, apply_rate
from app.shared.money import is_currency, minor_units
from app.shared.price_parser import (
    PriceHints,
    PriceReading,
    Separator,
    infer_decimal_separator,
    parse_price,
)

logger = structlog.get_logger(__name__)

ClarificationKind = Literal[
    "currency_mismatch",
    "currency_missing",
    "ambiguous_separator",
    "k_suffix",
    "ambiguous_unit",
    "arithmetic_mismatch",
    "unreadable_value",
]
KIND_ORDER: tuple[ClarificationKind, ...] = (
    "currency_mismatch",
    "currency_missing",
    "ambiguous_separator",
    "k_suffix",
    "ambiguous_unit",
    "arithmetic_mismatch",
    "unreadable_value",
)

RateLookup = Callable[[str], Awaitable[Rate | None]]


class ClarifyOption(BaseModel):
    # Sent back as the answer for the question's `key` ("RWF", ",", "yes", "convert", "keep").
    value: str
    label_key: str
    params: dict[str, str] = Field(default_factory=dict)
    disabled: bool = False
    disabled_reason_key: str | None = None
    # The chef types or picks the value (a currency, a pack size such as "50 kg").
    input: Literal["currency", "pack_size"] | None = None
    # Handled in the app, no answer sent: open the currency-change flow, or edit the row.
    action: Literal["change_currency", "edit"] | None = None


class Clarification(BaseModel):
    # The answer slot: "currency", "decimal_separator", "k_suffix", "mismatch",
    # "unit:<row>", "arith:<n>", "unreadable:<row>".
    key: str
    kind: ClarificationKind
    question_key: str
    params: dict[str, str] = Field(default_factory=dict)
    options: list[ClarifyOption]
    preselected: str | None = None
    # Rows (menu items / document lines) the answer changes.
    targets: list[int] = Field(default_factory=list)


class ScanAnswers(BaseModel):
    """The chef's answers so far in one scan (sent back with every resolve call)."""

    model_config = ConfigDict(extra="forbid")

    currency: str | None = Field(default=None, min_length=3, max_length=3)
    decimal_separator: Literal[".", ","] | None = None
    k_suffix: Literal["yes", "no"] | None = None
    mismatch: Literal["convert", "skip"] | None = None
    # Row-level answers by question key: "unit:<row>" → "us" | "uk" | a pack size such as
    # "50 kg"; "arith:<n>" → "keep"; "unreadable:<row>" → "keep" | "skip".
    rows: dict[str, str] = Field(default_factory=dict, max_length=500)


PriceStatus = Literal["ok", "needs_answer", "none", "unreadable", "skipped"]


@dataclass
class ResolvedPrice:
    """One printed price after the parser, the hints and the chef's answers."""

    text: str | None
    status: PriceStatus
    amount: Decimal | None = None
    currency: str | None = None
    # Set when converted to the kitchen's currency at a table rate.
    original_amount: Decimal | None = None
    original_currency: str | None = None
    rate: Rate | None = None
    kind: str | None = None  # "free" / "market_price"
    reading: PriceReading | None = None
    # Pending question kinds for this price.
    pending: set[str] = field(default_factory=set)
    model_disagrees: bool = False


@dataclass(frozen=True)
class ScanContext:
    kitchen_currency: str
    country: str | None
    conversion_enabled: bool
    # Assistant: a bare number the chef typed is in the kitchen's currency (no question).
    # Never for "$" / "dollars", which name a currency without saying which.
    bare_number_is_kitchen_currency: bool = False


def _fmt(value: Decimal) -> str:
    return format(value.normalize(), "f")


def _separator_in(text: str) -> Separator | None:
    digits = re.sub(r"[^\d.,]", "", text or "")
    if digits.count(".") == 1 and "," not in digits:
        return "."
    if digits.count(",") == 1 and "." not in digits:
        return ","
    return None


def _model_amount(text: str | None) -> Decimal | None:
    if not text:
        return None
    try:
        value = Decimal(str(text).strip())
    except ArithmeticError:
        return None
    return value if value.is_finite() else None


async def resolve_prices(
    texts: list[str | None],
    model_amounts: list[str | None],
    ctx: ScanContext,
    answers: ScanAnswers,
    rate_for: RateLookup,
    keys: list[str] | None = None,
) -> list[ResolvedPrice]:
    """Read every printed price of one scan with the same hints and answers. `keys` name
    each price for row-level answers ("unreadable:<key>"); default: its index."""
    keys = keys or [str(i) for i in range(len(texts))]
    own = ctx.kitchen_currency
    separator = answers.decimal_separator or infer_decimal_separator([t for t in texts if t])
    hints = PriceHints(kitchen_currency=own, country=ctx.country, decimal_separator=separator)
    answered_currency = answers.currency.upper() if answers.currency else None
    if answered_currency and not is_currency(answered_currency):
        answered_currency = None
    rates: dict[str, Rate | None] = {}
    out: list[ResolvedPrice] = []
    for index, (text, model_text) in enumerate(zip(texts, model_amounts, strict=True)):
        if answers.rows.get(f"unreadable:{keys[index]}") == "skip":
            out.append(ResolvedPrice(text, "skipped"))
            continue
        if not text or not text.strip():
            out.append(ResolvedPrice(text, "none"))
            continue
        reading = parse_price(text, hints)
        price = ResolvedPrice(text, "ok", reading=reading)
        out.append(price)
        if reading.status == "no_price":
            price.status, price.kind = "none", reading.kind
            continue
        if reading.status == "unreadable":
            price.status = "unreadable"
            continue
        amount = reading.amount
        if "ambiguous_separator" in reading.flags:
            price.pending.add("ambiguous_separator")
        if "k_suffix" in reading.flags:
            if answers.k_suffix == "no":
                price.status = "unreadable"
                continue
            if answers.k_suffix is None:
                price.pending.add("k_suffix")
        currency = reading.currency
        if currency is None:
            if answered_currency:
                currency = answered_currency
            elif ctx.bare_number_is_kitchen_currency and not reading.currency_candidates:
                currency = own
            else:
                price.pending.add("currency_missing")
        price.amount, price.currency = amount, currency
        if amount is not None:
            model_value = _model_amount(model_text)
            if model_value is not None and model_value != amount:
                price.model_disagrees = True
            exponent = amount.normalize().as_tuple().exponent
            places = -exponent if isinstance(exponent, int) else 0
            if currency and places > minor_units(currency):
                price.status = "unreadable"  # e.g. "1500.50 Rwf": RWF has no cents
                continue
        if currency and currency != own and amount is not None and not price.pending:
            if answers.mismatch == "skip":
                price.status = "skipped"
                continue
            if answers.mismatch == "convert" and ctx.conversion_enabled:
                if currency not in rates:
                    rates[currency] = await rate_for(currency)
                rate = rates[currency]
                if rate is not None:
                    converted = apply_rate(amount, rate)
                    price.original_amount, price.original_currency = amount, currency
                    price.amount, price.currency, price.rate = converted.amount, own, rate
                    continue
            price.pending.add("currency_mismatch")
        if price.pending:
            price.status = "needs_answer"
    return out


async def price_clarifications(
    prices: list[ResolvedPrice],
    names: list[str],
    ctx: ScanContext,
    answers: ScanAnswers,
    rate_for: RateLookup,
    keys: list[str] | None = None,
    row_of: list[int] | None = None,
) -> list[Clarification]:
    """Questions for a scan's prices (at most one per kind, plus one per unreadable price).
    `names[i]` labels price i; `row_of[i]` is the row it belongs to (default: i)."""
    out: list[Clarification] = []
    own = ctx.kitchen_currency
    keys = keys or [str(i) for i in range(len(prices))]
    row_of = row_of or list(range(len(prices)))

    def rows(kind: str) -> list[int]:
        return [i for i, p in enumerate(prices) if kind in p.pending]

    def targets(indexes: list[int]) -> list[int]:
        return sorted({row_of[i] for i in indexes})

    missing = rows("currency_missing")
    if missing:
        candidates: list[str] = []
        for i in missing:
            reading = prices[i].reading
            for code in reading.currency_candidates if reading else []:
                if code not in candidates:
                    candidates.append(code)
        options = [ClarifyOption(value=own, label_key="clarify.option.kitchen_currency",
                                 params={"currency": own})]  # fmt: skip
        options += [
            ClarifyOption(value=c, label_key="clarify.option.currency", params={"currency": c})
            for c in candidates[:4]
            if c != own
        ]
        options.append(
            ClarifyOption(value="", label_key="clarify.option.other_currency", input="currency")
        )
        symbol = next((p.reading.text for p in (prices[i] for i in missing) if p.reading), "")
        out.append(
            Clarification(
                key="currency",
                kind="currency_missing",
                question_key=(
                    "clarify.currency_ambiguous.question"
                    if candidates
                    else "clarify.currency_missing.question"
                ),
                params={"example": symbol, "kitchen_currency": own},
                options=options,
                preselected=own,
                targets=targets(missing),
            )
        )

    separator_rows = rows("ambiguous_separator")
    if separator_rows:
        example = prices[separator_rows[0]]
        sep = _separator_in(example.text or "") or "."
        other: Separator = "," if sep == "." else "."
        reading = example.reading
        grouped = max(reading.amount_candidates) if reading and reading.amount_candidates else None
        decimal = min(reading.amount_candidates) if reading and reading.amount_candidates else None
        out.append(
            Clarification(
                key="decimal_separator",
                kind="ambiguous_separator",
                question_key="clarify.ambiguous_separator.question",
                params={"example": example.text or ""},
                options=[
                    # Thousands reading: the printed separator groups, so the other is decimal.
                    ClarifyOption(
                        value=other,
                        label_key="clarify.option.amount",
                        params={"amount": _fmt(grouped) if grouped else ""},
                    ),
                    ClarifyOption(
                        value=sep,
                        label_key="clarify.option.amount",
                        params={"amount": _fmt(decimal) if decimal else ""},
                    ),
                ],  # fmt: skip
                targets=targets(separator_rows),
            )
        )

    k_rows = rows("k_suffix")
    if k_rows:
        example = prices[k_rows[0]]
        out.append(
            Clarification(
                key="k_suffix",
                kind="k_suffix",
                question_key="clarify.k_suffix.question",
                params={
                    "example": example.text or "",
                    "amount": _fmt(example.amount) if example.amount is not None else "",
                },
                options=[
                    ClarifyOption(value="yes", label_key="clarify.option.yes"),
                    ClarifyOption(value="no", label_key="clarify.option.no"),
                ],
                targets=targets(k_rows),
            )
        )

    mismatch = rows("currency_mismatch")
    if mismatch:
        foreign = sorted({str(prices[i].currency) for i in mismatch})
        first = foreign[0]
        rate = await rate_for(first) if ctx.conversion_enabled else None
        all_rates = rate is not None
        for code in foreign[1:] if ctx.conversion_enabled else []:
            all_rates = all_rates and await rate_for(code) is not None
        convert = ClarifyOption(value="convert", label_key="clarify.option.convert",
                                params={"from": first, "to": own})  # fmt: skip
        if not ctx.conversion_enabled:
            convert.disabled, convert.disabled_reason_key = True, "clarify.reason.conversion_off"
            convert.label_key = "clarify.option.convert_disabled"
        elif rate is None or not all_rates:
            convert.disabled, convert.disabled_reason_key = True, "clarify.reason.rate_unavailable"
            convert.label_key = "clarify.option.convert_disabled"
        else:
            convert.params |= {"rate": _fmt(rate.rate), "date": rate.rate_date.isoformat()}
        out.append(
            Clarification(
                key="mismatch",
                kind="currency_mismatch",
                question_key="clarify.currency_mismatch.question",
                params={"currency": ", ".join(foreign), "kitchen_currency": own},
                options=[
                    convert,
                    ClarifyOption(
                        value="change_currency",
                        label_key="clarify.option.change_kitchen_currency",
                        params={"currency": first},
                        action="change_currency",
                    ),
                    ClarifyOption(value="skip", label_key="clarify.option.skip_prices"),
                ],  # fmt: skip
                targets=targets(mismatch),
            )
        )

    for i, price in enumerate(prices):
        key = f"unreadable:{keys[i]}"
        if key in answers.rows:
            continue
        if price.status == "unreadable" or (price.model_disagrees and price.status == "ok"):
            options = [
                ClarifyOption(value="edit", label_key="clarify.option.type_it", action="edit"),
                ClarifyOption(value="skip", label_key="clarify.option.skip"),
            ]
            if price.model_disagrees and price.amount is not None:
                keep = ClarifyOption(
                    value="keep",
                    label_key="clarify.option.keep_amount",
                    params={"amount": _fmt(price.amount)},
                )
                options.insert(0, keep)
            out.append(
                Clarification(
                    key=key,
                    kind="unreadable_value",
                    question_key="clarify.unreadable_value.question",
                    params={"name": names[i] if i < len(names) else "", "text": price.text or ""},
                    options=options,
                    targets=[row_of[i]],
                )
            )
    return out


def order_clarifications(items: list[Clarification]) -> list[Clarification]:
    """Biggest effect first (most rows), then the fixed kind order."""
    return sorted(items, key=lambda c: (-len(c.targets), KIND_ORDER.index(c.kind)))


def log_clarifications(feature: str, request_id: str, items: list[Clarification]) -> None:
    """One event per question kind asked (no content: kind and counts only)."""
    for clarification in items:
        logger.info(
            "ai_clarification",
            feature=feature,
            kind=clarification.kind,
            rows=len(clarification.targets),
            request_id=request_id,
        )
