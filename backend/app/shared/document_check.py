"""Receipt / invoice arithmetic check (Step 2a build step 4). Flags, never corrects.

1. Lines are sorted into items and non-item lines by their label: subtotal, tax / VAT,
   service charge, discount, tip, delivery fee, deposit, cash tendered, change, rounding,
   total. Non-item lines never enter the item sum.
2. Each item: quantity x unit price = line total, within ±1 minor unit (configurable).
3. Items → subtotal; subtotal + tax + service + tip + delivery + rounding - discount → total,
   within ±0.5 % of the total (configurable). Tax already included in the prices (common for
   VAT) also passes. Cash and change are never part of the total; a deposit is reported but
   not added.
4. The total in words (EN/FR), when present and readable, must equal the printed total;
   unreadable words skip that check.
A document without prices (most delivery notes) is "not_applicable".
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Literal

from app.shared.money import minor_units
from app.shared.number_words import parse_amount_words

LineKind = Literal[
    "item", "subtotal", "tax", "service", "discount", "tip", "delivery", "deposit", "cash",
    "change", "rounding", "total",
]  # fmt: skip

# Checked in this order: "subtotal" before "total", "total tax" is tax, "change" vs "exchange".
_LABELS: list[tuple[LineKind, re.Pattern[str]]] = [
    ("subtotal", re.compile(r"\b(sub ?-?total|sous ?-?total|total partiel|total ht|net amount)\b")),
    ("tax", re.compile(r"\b(tax|taxes|vat|tva|gst|hst|pst|sales tax|impot|imposition|taxe)\b")),
    ("service", re.compile(r"\b(service( charge)?|svc|frais de service)\b")),
    ("discount", re.compile(r"\b(discount|remise|reduction|rabais|promo|coupon|voucher|less)\b")),
    ("tip", re.compile(r"\b(tip|tips|gratuity|pourboire)\b")),
    ("delivery", re.compile(
        r"\b(delivery( fee| charge)?|shipping|transport|livraison|frais de livraison|carriage)\b"
    )),
    ("deposit", re.compile(r"\b(deposit|caution|acompte|advance|avance)\b")),
    ("cash", re.compile(
        r"\b(cash( tendered)?|tendered|especes|paid|amount paid|recu|card|visa|mastercard"
        r"|mobile money|momo)\b"
    )),
    ("change", re.compile(r"(^|\b)(change|change due|monnaie|rendu|a rendre)\b")),
    ("rounding", re.compile(r"\b(rounding|arrondi)\b")),
    ("total", re.compile(
        r"\b(total|grand total|amount due|balance due|total due|net a payer|montant total"
        r"|a payer|total ttc|ttc)\b"
    )),
]  # fmt: skip


def classify_line(label: str) -> LineKind:
    """Item or one of the non-item kinds, from the printed label."""
    folded = unicodedata.normalize("NFKD", label).encode("ascii", "ignore").decode().lower()
    folded = re.sub(r"[^a-z0-9 -]", " ", folded)
    folded = re.sub(r"\s+", " ", folded).strip()
    if not folded:
        return "item"
    for kind, pattern in _LABELS:
        if pattern.search(folded):
            return kind
    return "item"


@dataclass(frozen=True)
class DocLine:
    label: str
    quantity: Decimal | None = None
    unit_price: Decimal | None = None
    line_total: Decimal | None = None


@dataclass(frozen=True)
class Issue:
    kind: Literal["line_arithmetic", "subtotal_mismatch", "total_mismatch", "words_mismatch"]
    message: str
    expected: Decimal
    printed: Decimal
    line_index: int | None = None
    label: str | None = None


@dataclass
class DocumentCheck:
    status: Literal["ok", "mismatch", "not_applicable"]
    issues: list[Issue] = field(default_factory=list)
    items_sum: Decimal | None = None
    subtotal: Decimal | None = None
    total: Decimal | None = None
    tax_included: bool = False
    # Checks that could not run (e.g. "words_unreadable", "no_total").
    skipped: list[str] = field(default_factory=list)
    kinds: list[LineKind] = field(default_factory=list)


def check_document(
    lines: list[DocLine],
    currency: str,
    *,
    total_in_words: str | None = None,
    line_tolerance_minor: int = 1,
    total_tolerance_pct: Decimal = Decimal("0.5"),
) -> DocumentCheck:
    minor = Decimal(1).scaleb(-minor_units(currency))
    line_tol = minor * line_tolerance_minor
    kinds = [classify_line(ln.label) for ln in lines]
    result = DocumentCheck(status="ok", kinds=kinds)

    priced = [ln for ln in lines if ln.line_total is not None or ln.unit_price is not None]
    if not priced:
        result.status = "not_applicable"
        return result

    items_sum = Decimal(0)
    by_kind: dict[str, Decimal] = {}
    for index, (line, kind) in enumerate(zip(lines, kinds, strict=True)):
        if kind != "item":
            if line.line_total is not None:
                by_kind[kind] = by_kind.get(kind, Decimal(0)) + abs(line.line_total)
            continue
        if (
            line.quantity is not None
            and line.unit_price is not None
            and line.line_total is not None
        ):
            expected = line.quantity * line.unit_price
            if abs(expected - line.line_total) > line_tol:
                result.issues.append(
                    Issue(
                        "line_arithmetic",
                        f"{line.quantity} x {line.unit_price} = {expected}, "
                        f"printed {line.line_total}",
                        expected,
                        line.line_total,
                        index,
                        line.label,
                    )
                )
        amount = line.line_total
        if amount is None and line.quantity is not None and line.unit_price is not None:
            amount = line.quantity * line.unit_price
        if amount is not None:
            items_sum += amount
    result.items_sum = items_sum
    subtotal = by_kind.get("subtotal")
    total = by_kind.get("total")
    result.subtotal, result.total = subtotal, total

    def within(expected: Decimal, printed: Decimal) -> bool:
        tolerance = max(abs(printed) * total_tolerance_pct / 100, line_tol)
        return abs(expected - printed) <= tolerance

    if subtotal is not None and not within(items_sum, subtotal):
        result.issues.append(
            Issue(
                "subtotal_mismatch",
                f"items add up to {items_sum}, subtotal printed {subtotal}",
                items_sum,
                subtotal,
            )
        )
    if total is None:
        result.skipped.append("no_total")
    else:
        base = subtotal if subtotal is not None else items_sum
        fees = sum(
            (by_kind.get(k, Decimal(0)) for k in ("service", "tip", "delivery", "rounding")),
            Decimal(0),
        )
        discount = by_kind.get("discount", Decimal(0))
        tax = by_kind.get("tax", Decimal(0))
        with_tax = base + tax + fees - discount
        if within(with_tax, total):
            pass
        elif tax and within(base + fees - discount, total):
            result.tax_included = True  # VAT already in the prices
        else:
            result.issues.append(
                Issue(
                    "total_mismatch",
                    f"{base} + tax {tax} + fees {fees} - discounts {discount} = {with_tax}, "
                    f"total printed {total}",
                    with_tax,
                    total,
                )
            )
        if total_in_words:
            words = parse_amount_words(total_in_words)
            if words is None:
                result.skipped.append("words_unreadable")
            elif not within(words, total):
                result.issues.append(
                    Issue(
                        "words_mismatch",
                        f"total in words reads {words}, figures say {total}",
                        words,
                        total,
                    )
                )
    if result.issues:
        result.status = "mismatch"
    return result
