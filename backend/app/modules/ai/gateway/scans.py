"""Menu and document scans, v2 (Step 2a build step 5): from the model's rows to the result
the chef reviews, with the clarifying questions still open.

Pure apart from the rate lookup, and used twice: right after the model call, and by the
resolve endpoints when the chef answers a question (same rows, more answers, no model call).
Prices are read by the deterministic parser, units by the unit registry, document arithmetic
by `check_document`; the model's own amounts are only a cross-check.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Sequence
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.calculations import parse_quantity
from app.modules.ai.clarifications import (
    Clarification,
    ClarifyOption,
    RateLookup,
    ResolvedPrice,
    ScanAnswers,
    ScanContext,
    order_clarifications,
    price_clarifications,
    resolve_prices,
)
from app.modules.ai.schemas.gateway import (
    ArithmeticCheckOut,
    ArithmeticIssueOut,
    DocumentExtractionResponse,
    DocumentLine,
    DocumentSummaryLine,
    ImageKind,
    ImageQuality,
    MenuExtractionResponse,
    MenuExtractItem,
    ModelDocumentExtractionV2,
    ModelMenuItemV2,
    MoneyRead,
)
from app.modules.exchange_rates.schemas import RateOut
from app.modules.exchange_rates.service import ExchangeRateService, Rate
from app.modules.kitchens.models import Kitchen
from app.shared.document_check import DocLine, check_document, classify_line
from app.shared.kitchen_time import kitchen_today
from app.shared.money import minor_units
from app.shared.schemas.money import MoneyOut
from app.shared.units import PACK_UNITS, convert, parse_pack_size, parse_unit

# Imperial units always convert exactly; the printed quantity and unit are kept beside.
_METRIC_TARGET = {"lb": "kg", "oz": "g", "dozen": "piece"}
_US_UK_UNITS = {"gallon", "quart", "pint", "fl_oz"}


def scan_context(kitchen: Kitchen) -> ScanContext:
    return ScanContext(
        kitchen_currency=str(kitchen.currency),
        country=kitchen.country,
        conversion_enabled=bool(kitchen.conversion_enabled),
    )


def table_rates(db: AsyncSession, kitchen: Kitchen, on: date | None = None) -> RateLookup:
    """Rates from the rates table only (never from the document), cached per scan."""
    day = on or kitchen_today(kitchen)
    service = ExchangeRateService(db)
    cache: dict[str, Rate | None] = {}

    async def rate_for(code: str) -> Rate | None:
        if code not in cache:
            cache[code] = await service.find_rate(code, str(kitchen.currency), day)
        return cache[code]

    return rate_for


def _money(amount: Decimal | None, currency: str | None) -> MoneyOut | None:
    if amount is None or not currency:
        return None
    places = Decimal(1).scaleb(-minor_units(currency))
    return MoneyOut(amount=format(amount.quantize(places), "f"), currency=currency)


def _legacy_int(price: ResolvedPrice, own: str) -> int | None:
    """Old app versions read a whole number in the kitchen's currency: only when settled."""
    if price.status != "ok" or price.currency != own or price.amount is None:
        return None
    if price.amount != price.amount.to_integral_value():
        return None
    return int(price.amount)


def _read(price: ResolvedPrice) -> MoneyRead | None:
    """What was read from the printed text, before conversion and before any open
    question is answered (null amount = two readings; null currency = not settled)."""
    if not price.text or price.reading is None or price.status in ("none", "skipped"):
        return None
    amount = price.original_amount if price.original_amount is not None else price.amount
    currency = price.original_currency or price.currency
    if "currency_missing" in price.pending and price.reading.currency is None:
        currency = None
    return MoneyRead(amount=_num(amount) if amount is not None else None, currency=currency)


def _settled(price: ResolvedPrice) -> bool:
    return price.status == "ok" and price.amount is not None


# ── Menu ──────────────────────────────────────────────────────────────────────


async def build_menu(
    rows: list[ModelMenuItemV2],
    *,
    kind: ImageKind,
    image_quality: ImageQuality,
    ctx: ScanContext,
    answers: ScanAnswers,
    rate_for: RateLookup,
    request_id: str,
    prompt_version: str,
) -> MenuExtractionResponse:
    texts = [row.price.text if row.price else None for row in rows]
    model_amounts = [row.price.amount if row.price else None for row in rows]
    prices = await resolve_prices(texts, model_amounts, ctx, answers, rate_for)
    names = [row.name.strip() for row in rows]
    items: list[MenuExtractItem] = []
    for row, name, price in zip(rows, names, prices, strict=True):
        price_conf = row.price.confidence if row.price and _settled(price) else 0.0
        if price.model_disagrees:
            price_conf = min(price_conf, 0.4)
        settled = _settled(price)
        items.append(
            MenuExtractItem(
                name=name,
                category=row.category,
                price=_legacy_int(price, ctx.kitchen_currency),
                description=row.description,
                confidence=round(
                    min(row.name_confidence, price_conf if row.price else row.name_confidence),
                    2,
                ),
                name_confidence=row.name_confidence,
                price_confidence=price_conf,
                source_text=row.source_text,
                price_text=price.text,
                price_money=_money(price.amount, price.currency) if settled else None,
                price_original=_money(price.original_amount, price.original_currency),
                price_rate=RateOut.of(price.rate),
                price_status=price.status,
                price_read=_read(price),
            )
        )
    clarifications = order_clarifications(
        await price_clarifications(prices, names, ctx, answers, rate_for)
    )
    return MenuExtractionResponse(
        kind=kind,
        items=items,
        image_quality=image_quality,
        request_id=request_id,
        prompt_version=prompt_version,
        currency=ctx.kitchen_currency,
        clarifications=clarifications,
        answers=answers,
        model_items=rows,
    )


# ── Documents ─────────────────────────────────────────────────────────────────


def _quantity_and_unit(
    row: int, quantity: Decimal | None, unit_text: str | None, answers: ScanAnswers
) -> tuple[Decimal | None, str | None, str | None, str | None, str, Clarification | None]:
    """(quantity, unit, original quantity, original unit, unit status, question).

    lb / oz / dozen convert exactly; US/UK measures and unsized packs are asked."""
    unit = (unit_text or "").strip() or None
    if quantity is None or unit is None:
        return quantity, unit, None, None, "ok", None
    parsed = parse_unit(unit)
    key = f"unit:{row}"
    answer = answers.rows.get(key)
    if parsed.unit in _US_UK_UNITS and parsed.measure is None:
        if answer in ("us", "uk"):
            done = convert(quantity, f"{answer} {unit}", "l")
            if done.status == "ok" and done.qty is not None:
                return done.qty, "l", _num(quantity), unit, "ok", None
        return (
            quantity,
            unit,
            None,
            None,
            "ask",
            Clarification(
                key=key,
                kind="ambiguous_unit",
                question_key="clarify.ambiguous_unit.us_or_uk",
                params={"unit": unit, "quantity": format(quantity.normalize(), "f")},
                options=[
                    ClarifyOption(value="us", label_key="clarify.option.us"),
                    ClarifyOption(value="uk", label_key="clarify.option.uk"),
                ],
                targets=[row],
            ),
        )
    if (parsed.unit in PACK_UNITS or parsed.unit == "pack") and parsed.pack_qty is None:
        size = parse_pack_size(answer)
        if size is not None:
            done = convert(quantity, unit, size[1], pack_size=size)
            if done.status == "ok" and done.qty is not None:
                return done.qty, done.unit, _num(quantity), unit, "ok", None
        return (
            quantity,
            unit,
            None,
            None,
            "ask",
            Clarification(
                key=key,
                kind="ambiguous_unit",
                question_key="clarify.ambiguous_unit.pack_size",
                params={"unit": unit, "quantity": format(quantity.normalize(), "f")},
                options=[
                    ClarifyOption(
                        value="", label_key="clarify.option.pack_size", input="pack_size"
                    ),
                    ClarifyOption(value="keep", label_key="clarify.option.keep_unit"),
                ],
                targets=[row],
            )
            if answer != "keep"
            else None,
        )
    if parsed.unit and parsed.pack_qty is not None and parsed.pack_unit:
        done = convert(quantity, unit, parsed.pack_unit)
        if done.status == "ok" and done.qty is not None:
            return done.qty, parsed.pack_unit, _num(quantity), unit, "ok", None
    target = _METRIC_TARGET.get(parsed.unit or "")
    if target:
        done = convert(quantity, unit, target)
        if done.status == "ok" and done.qty is not None:
            return done.qty.quantize(Decimal("0.001")), target, _num(quantity), unit, "ok", None
    return quantity, unit, None, None, "ok" if parsed.unit else "unknown", None


def _unit_price(
    unit_price: ResolvedPrice,
    line_total: ResolvedPrice,
    printed_qty: Decimal | None,
    qty: Decimal | None,
    converted_from: str | None,
) -> MoneyOut | None:
    """Price per unit of the (possibly converted) quantity: the printed unit price, re-based
    when the unit was converted (3 lb at 2.00/lb = 6.00 for 1.361 kg, so 4.41/kg), or the
    line total / quantity when no unit price is printed. Rounded half-up to the minor unit."""
    if _settled(unit_price) and unit_price.amount is not None and unit_price.currency:
        amount = unit_price.amount
        if converted_from is not None and printed_qty and qty:
            amount = amount * printed_qty / qty
        return _money(_half_up(amount, unit_price.currency), unit_price.currency)
    if _settled(line_total) and line_total.amount is not None and line_total.currency and qty:
        amount = line_total.amount / qty
        return _money(_half_up(amount, line_total.currency), line_total.currency)
    return None


def _half_up(amount: Decimal, currency: str) -> Decimal:
    return amount.quantize(Decimal(1).scaleb(-minor_units(currency)), rounding=ROUND_HALF_UP)


def _legacy_whole(money: MoneyOut | None, own: str) -> int | None:
    if money is None or money.currency != own:
        return None
    value = Decimal(money.amount)
    return int(value) if value == value.to_integral_value() else None


def _num(value: Decimal | None) -> str | None:
    return None if value is None else format(value.normalize(), "f")


async def build_document(
    raw: ModelDocumentExtractionV2,
    *,
    ctx: ScanContext,
    answers: ScanAnswers,
    rate_for: RateLookup,
    request_id: str,
    prompt_version: str,
    iso_date: str | None,
) -> DocumentExtractionResponse:
    own = ctx.kitchen_currency
    kinds = [classify_line(row.name) for row in raw.lines]
    # Every printed amount, unit prices then line totals, read with one set of hints.
    texts: list[str | None] = []
    model_amounts: list[str | None] = []
    keys: list[str] = []
    row_of: list[int] = []
    names: list[str] = []
    for i, row in enumerate(raw.lines):
        for field_name, price in (("unit_price", row.unit_price), ("line_total", row.line_total)):
            texts.append(price.text if price else None)
            model_amounts.append(price.amount if price else None)
            keys.append(f"{i}.{field_name}")
            row_of.append(i)
            names.append(row.name.strip())
    prices = await resolve_prices(texts, model_amounts, ctx, answers, rate_for, keys)
    clarifications = await price_clarifications(prices, names, ctx, answers, rate_for, keys, row_of)

    printed = Counter(
        p.original_currency or p.currency for p in prices if p.amount is not None and p.currency
    )
    doc_currency = printed.most_common(1)[0][0] if printed else None

    def original(p: ResolvedPrice) -> Decimal | None:
        """The amount as printed (before any conversion), for the arithmetic check."""
        if p.amount is None or p.status not in ("ok", "needs_answer"):
            return None
        if "ambiguous_separator" in p.pending or "k_suffix" in p.pending:
            return None
        return p.original_amount if p.original_amount is not None else p.amount

    lines: list[DocumentLine] = []
    summary: list[DocumentSummaryLine] = []
    doc_lines: list[DocLine] = []
    for i, row in enumerate(raw.lines):
        unit_price, line_total = prices[2 * i], prices[2 * i + 1]
        quantity = parse_quantity(row.quantity_text)
        doc_lines.append(DocLine(row.name, quantity, original(unit_price), original(line_total)))
        if kinds[i] != "item":
            summary.append(
                DocumentSummaryLine(
                    row=i,
                    label=row.name.strip(),
                    kind=kinds[i],
                    # As printed, in the document's currency (like subtotal and total).
                    amount=_money(original(line_total), doc_currency or own),
                )
            )
            continue
        qty, unit, orig_qty, orig_unit, unit_status, question = _quantity_and_unit(
            i, quantity, row.unit, answers
        )
        if question is not None:
            clarifications.append(question)
        unreadable = (row.quantity_text is not None and quantity is None) or any(
            p.text and p.status == "unreadable" for p in (unit_price, line_total)
        )
        unit_money = _unit_price(unit_price, line_total, quantity, qty, orig_qty)
        status = "ok"
        for p in (unit_price, line_total):
            if p.status in ("needs_answer", "unreadable", "skipped"):
                status = p.status
                break
        lines.append(
            DocumentLine(
                name=row.name.strip(),
                quantity=_num(qty),
                unit=unit,
                unit_price=_legacy_whole(unit_money, own),
                line_total=_legacy_int(line_total, own),
                confidence=round(min(row.confidence, 0.4) if unreadable else row.confidence, 2),
                row=i,
                unit_price_money=unit_money,
                line_total_money=_money(line_total.amount, line_total.currency)
                if _settled(line_total)
                else None,
                original_quantity=orig_qty,
                original_unit=orig_unit,
                unit_status=unit_status,
                price_status=status,
                unit_price_read=_read(unit_price),
                line_total_read=_read(line_total),
            )
        )

    check = check_document(doc_lines, doc_currency or own, total_in_words=raw.total_in_words)
    issues: list[ArithmeticIssueOut] = []
    for issue in check.issues:
        key = f"arith:{issue.kind}:{issue.line_index if issue.line_index is not None else 'doc'}"
        issues.append(
            ArithmeticIssueOut(
                kind=issue.kind,
                row=issue.line_index,
                label=issue.label,
                expected=_num(issue.expected) or "",
                printed=_num(issue.printed) or "",
            )
        )
        if key in answers.rows:
            continue
        line = raw.lines[issue.line_index] if issue.line_index is not None else None
        clarifications.append(
            Clarification(
                key=key,
                kind="arithmetic_mismatch",
                question_key=f"clarify.arithmetic_mismatch.{issue.kind}",
                params={
                    "label": issue.label or "",
                    "row": str((issue.line_index or 0) + 1),
                    "quantity": line.quantity_text or "" if line else "",
                    "unit_price": (line.unit_price.text if line and line.unit_price else ""),
                    "expected": _num(issue.expected) or "",
                    "printed": _num(issue.printed) or "",
                    "currency": doc_currency or own,
                },
                options=[
                    ClarifyOption(value="keep", label_key="clarify.option.keep_printed"),
                    ClarifyOption(value="edit", label_key="clarify.option.edit", action="edit"),
                ],
                targets=[issue.line_index] if issue.line_index is not None else [],
            )
        )

    currency = doc_currency or own
    return DocumentExtractionResponse(
        kind=raw.kind,
        supplier_name=(raw.supplier_name or "").strip() or None,
        document_date=iso_date,
        lines=lines,
        image_quality=raw.image_quality,
        request_id=request_id,
        prompt_version=prompt_version,
        currency=currency,
        summary=summary,
        subtotal=_money(check.subtotal, currency),
        tax=_money(_tax(summary), currency),
        total=_money(check.total, currency),
        total_read=_total_read(raw, kinds, prices),
        arithmetic=ArithmeticCheckOut(
            status=check.status,
            issues=issues,
            tax_included=check.tax_included,
            skipped=check.skipped,
        ),
        clarifications=order_clarifications(clarifications),
        answers=answers,
        model_extraction=raw,
    )


def _total_read(
    raw: ModelDocumentExtractionV2, kinds: Sequence[str], prices: list[ResolvedPrice]
) -> MoneyRead | None:
    """The printed total row as read (the last one, e.g. after a subtotal)."""
    for i in range(len(raw.lines) - 1, -1, -1):
        if kinds[i] == "total":
            return _read(prices[2 * i + 1])
    return None


def _tax(summary: list[DocumentSummaryLine]) -> Decimal | None:
    amounts = [Decimal(s.amount.amount) for s in summary if s.kind == "tax" and s.amount]
    return sum(amounts, Decimal(0)) if amounts else None
