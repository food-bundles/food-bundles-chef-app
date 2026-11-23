"""Deterministic price reading for menus and documents (Step 2a build step 4).

The model returns each price exactly as printed; this module reads that text. It never
guesses: when a reading is still ambiguous after the hints (kitchen currency, country,
separators seen elsewhere in the same document), it returns status "ambiguous" with the
candidates, and the clarification policy asks the chef once per scan.

    parse_price("12,000 Rwf")      → 12000 RWF
    parse_price("$7.99")           → 7.99, currency ambiguous (USD, CAD, AUD, …)
    parse_price("1.500")           → ambiguous: 1500 or 1.5 (no currency printed)
    parse_price("₦71,200")         → 71200 NGN in any kitchen (naira never prints 3 decimals)
    parse_price("2.5k")            → 2500, needs a once-per-scan "k = thousand?" check
    parse_price("MP")              → no price (market price)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation
from typing import Literal

from app.shared.money import is_currency, minor_units

Status = Literal["ok", "ambiguous", "no_price", "unreadable"]
Separator = Literal[".", ","]

# Dollar currencies a "$" can mean (kitchen's own dollar first when it is one of them).
DOLLAR_CURRENCIES: tuple[str, ...] = (
    "USD", "CAD", "AUD", "NZD", "SGD", "HKD", "LRD", "NAD", "BSD", "JMD", "TTD", "MXN",
)  # fmt: skip
# "/-" (East Africa) and "sh": shillings, which country's is unknown.
SHILLING_CURRENCIES: tuple[str, ...] = ("KES", "UGX", "TZS", "SOS")

# Symbols and words → currency candidates. Longest tokens are matched first.
_CURRENCY_TOKENS: dict[str, tuple[str, ...]] = {
    "us$": ("USD",), "usd": ("USD",), "ca$": ("CAD",), "c$": ("CAD",), "a$": ("AUD",),
    "au$": ("AUD",), "nz$": ("NZD",), "$": DOLLAR_CURRENCIES,
    "dollar": DOLLAR_CURRENCIES, "dollars": DOLLAR_CURRENCIES, "bucks": DOLLAR_CURRENCIES,
    "us dollars": ("USD",), "us dollar": ("USD",),
    "shilling": SHILLING_CURRENCIES, "shillings": SHILLING_CURRENCIES,
    "€": ("EUR",), "eur": ("EUR",), "euro": ("EUR",), "euros": ("EUR",),
    "£": ("GBP",), "gbp": ("GBP",),
    "₦": ("NGN",), "ngn": ("NGN",), "naira": ("NGN",), "n": ("NGN",),
    "rwf": ("RWF",), "frw": ("RWF",), "rf": ("RWF",), "frs": ("RWF",),
    "ksh": ("KES",), "kshs": ("KES",), "kes": ("KES",),
    "ugx": ("UGX",), "ush": ("UGX",), "ushs": ("UGX",),
    "tsh": ("TZS",), "tshs": ("TZS",), "tzs": ("TZS",),
    "/-": SHILLING_CURRENCIES, "/=": SHILLING_CURRENCIES, "=/": SHILLING_CURRENCIES,
    "sh": SHILLING_CURRENCIES, "shs": SHILLING_CURRENCIES,
    "fcfa": ("XOF", "XAF"), "cfa": ("XOF", "XAF"),
    "₹": ("INR",), "¥": ("JPY", "CNY"), "₵": ("GHS",), "ghs": ("GHS",), "zar": ("ZAR",),
    "chf": ("CHF",), "etb": ("ETB",), "br": ("ETB",), "mad": ("MAD",), "dh": ("MAD", "AED"),
}  # fmt: skip

_FREE_WORDS = {"free", "gratuit", "gratuite", "offert", "offerte", "ubuntu", "complimentary"}
_MARKET_WORDS = {
    "mp", "m.p.", "m/p", "market price", "market", "prix du marché", "prix du marche",
    "selon le marché", "selon marché", "sp", "s.p.", "aq", "a.q.", "sq", "seasonal",
    "price on request", "sur demande", "ask", "tbd",
}  # fmt: skip

# Countries whose usual decimal separator is a comma (a HINT only).
COMMA_DECIMAL_COUNTRIES = frozenset(
    "FR BE DE ES IT PT NL AT LU GR PL CZ SK HU RO BG HR SI SE NO DK FI EE LV LT RU UA TR "
    "BR AR CL CO PE UY PY VE BO EC ID VN CM CI SN ML BF NE TG BJ GA CG CD CF TD GN BI MG "
    "MA DZ TN KM DJ MZ AO".split()
)

_SPACES = re.compile(r"[\s\u00a0\u202f\u2009]+")
_NUMBER = re.compile(r"\d[\d.,'\u2019\s\u00a0\u202f\u2009]*")


@dataclass(frozen=True)
class PriceHints:
    """What we know besides the text: never overrides what is printed."""

    kitchen_currency: str | None = None
    # Orders the candidates of an ambiguous reading (the preselected option); never decides.
    country: str | None = None
    # Seen elsewhere in the same document (see infer_decimal_separator): decides when the
    # printed currency does not.
    decimal_separator: Separator | None = None


@dataclass
class PriceReading:
    text: str
    status: Status
    amount: Decimal | None = None
    currency: str | None = None
    # Filled when status is "ambiguous" (one or both lists has more than one entry).
    amount_candidates: list[Decimal] = field(default_factory=list)
    currency_candidates: list[str] = field(default_factory=list)
    # "free" / "market_price" for no_price readings.
    kind: str | None = None
    # Things the clarification policy confirms once per scan: "k_suffix", "no_currency",
    # "ambiguous_separator", "ambiguous_currency", "inexact_for_currency".
    flags: list[str] = field(default_factory=list)


def _hint_separator(hints: PriceHints) -> Separator | None:
    if hints.country:
        return "," if hints.country.upper() in COMMA_DECIMAL_COUNTRIES else "."
    return None


def _find_currency(text: str) -> tuple[tuple[str, ...], str]:
    """Currency candidates named in the text, and the text with that token removed."""
    lowered = text.lower()
    for token in sorted(_CURRENCY_TOKENS, key=len, reverse=True):
        if token.isalpha():
            pattern = re.compile(rf"(?<![a-z]){re.escape(token)}(?![a-z])")
        else:
            pattern = re.compile(re.escape(token))
        match = pattern.search(lowered)
        if match:
            rest = text[: match.start()] + " " + text[match.end() :]
            return _CURRENCY_TOKENS[token], rest
    # Any other ISO 4217 code written as letters ("CHF 12", "12 MUR").
    for code in re.findall(r"(?<![A-Za-z])([A-Za-z]{3})(?![A-Za-z])", text):
        if is_currency(code):
            return (code.upper(),), re.sub(rf"(?<![A-Za-z]){code}(?![A-Za-z])", " ", text)
    return (), text


def _resolve_currency(candidates: tuple[str, ...], hints: PriceHints) -> list[str]:
    if len(candidates) <= 1:
        return list(candidates)
    own = (hints.kitchen_currency or "").upper()
    if own in candidates:
        return [own]  # e.g. "$" in a USD kitchen, "/-" in a KES kitchen
    return list(candidates)


def _amount_candidates(number: str, hints: PriceHints, currencies: list[str]) -> list[Decimal]:
    """All readings of a printed number, narrowed by the hints."""
    digits = number.replace("'", "").replace("\u2019", "")
    digits = _SPACES.sub("", digits)
    if not digits or not re.fullmatch(r"[\d.,]+", digits) or not digits[0].isdigit():
        return []
    dots, commas = digits.count("."), digits.count(",")
    if dots and commas:
        # Both: the last one is the decimal separator (1,200.50 / 12.000,00).
        decimal_sep = "." if digits.rfind(".") > digits.rfind(",") else ","
        group_sep = "," if decimal_sep == "." else "."
        whole, _, frac = digits.rpartition(decimal_sep)
        return _to_decimal(whole.replace(group_sep, "") + "." + frac)
    sep = "." if dots else "," if commas else None
    if sep is None:
        return _to_decimal(digits)
    parts = digits.split(sep)
    if len(parts) > 2:
        # 1.200.000 / 1,200,000: repeated separator = grouping (only valid with 3-digit groups).
        if all(len(p) == 3 for p in parts[1:]):
            return _to_decimal("".join(parts))
        return []
    whole, frac = parts
    if len(frac) != 3:
        # 7,99 / 2.5 / 0.0125: one separator not followed by exactly 3 digits is a decimal.
        return _to_decimal(whole + "." + frac)
    # Exactly 3 digits after one separator: 1500 (grouping) or 1.5 (decimal)?
    grouped = Decimal(whole + frac)
    decimal = Decimal(whole + "." + frac)
    # 1. The printed currency's own convention, in any kitchen: a currency with fewer than
    #    3 decimals (NGN, EUR, USD, KES, RWF...) never prints 3 decimal digits, so
    #    "₦71,200" / "€1.500" / "Ksh 1,500" group thousands. Only 3-decimal currencies
    #    (KWD, BHD, TND...) leave both readings open.
    if currencies and all(minor_units(c) < 3 for c in currencies):
        return [grouped]
    # 2. Separators the same document uses unambiguously elsewhere (evidence, not a guess).
    if hints.decimal_separator is not None:
        return [decimal] if hints.decimal_separator == sep else [grouped]
    # 3. No printed currency: the kitchen's currency decides only when it has no minor
    #    unit (1.5 RWF does not exist; 1.50 EUR does, so a EUR kitchen is asked).
    own = hints.kitchen_currency
    if not currencies and own and is_currency(own) and minor_units(own) == 0:
        return [grouped]
    # 4. Still two readings: ask. The kitchen's country only orders them (preselection).
    if _hint_separator(hints) == sep:
        return [decimal, grouped]
    return [grouped, decimal]


def _to_decimal(text: str) -> list[Decimal]:
    try:
        value = Decimal(text)
    except InvalidOperation:
        return []
    return [value] if value.is_finite() and value >= 0 else []


def parse_price(text: str | None, hints: PriceHints | None = None) -> PriceReading:
    """Read one printed price. See the module docstring for the rules."""
    hints = hints or PriceHints()
    raw = (text or "").strip()
    reading = PriceReading(text=raw, status="unreadable")
    if not raw:
        return reading
    lowered = raw.lower().strip(" .:-")
    if lowered in _FREE_WORDS:
        return PriceReading(raw, "no_price", amount=Decimal(0), kind="free")
    if lowered in _MARKET_WORDS:
        return PriceReading(raw, "no_price", kind="market_price")

    candidates, rest = _find_currency(raw)
    currencies = _resolve_currency(candidates, hints)

    k_suffix = False
    match = re.search(r"(\d[\d.,'\u2019\s\u00a0\u202f\u2009]*?)\s*([kK])(?![A-Za-z])", rest)
    if match:
        number, k_suffix = match.group(1), True
    else:
        found = _NUMBER.search(rest)
        if not found:
            return reading
        number = found.group(0).strip()
        # Anything else alphabetic left over (e.g. "about 20 or 30") makes it unreadable.
        leftover = (rest[: found.start()] + rest[found.end() :]).strip(" :-\u2013=()")
        if re.search(r"\d", leftover):
            return reading
    amounts = _amount_candidates(number, hints, currencies)
    if not amounts:
        return reading
    if k_suffix:
        amounts = [a * 1000 for a in amounts]
        reading.flags.append("k_suffix")

    reading.amount_candidates = amounts if len(amounts) > 1 else []
    reading.currency_candidates = currencies if len(currencies) > 1 else []
    reading.currency = currencies[0] if len(currencies) == 1 else None
    reading.amount = amounts[0] if len(amounts) == 1 else None
    if len(amounts) > 1:
        reading.flags.append("ambiguous_separator")
    if len(currencies) > 1:
        reading.flags.append("ambiguous_currency")
    if not currencies:
        reading.flags.append("no_currency")
    if reading.currency and reading.amount is not None:
        exponent = reading.amount.normalize().as_tuple().exponent
        if isinstance(exponent, int) and -exponent > minor_units(reading.currency):
            reading.flags.append("inexact_for_currency")
    reading.status = "ambiguous" if len(amounts) > 1 or len(currencies) > 1 else "ok"
    return reading


def infer_decimal_separator(texts: list[str]) -> Separator | None:
    """The decimal separator a document uses, from its unambiguous prices; None if unknown
    or contradictory. "12.000,00" → ","; "1,200.50" → "."; "7,99" → ","; "1.200.000" → ","."""
    votes: set[Separator] = set()
    for text in texts:
        number = _NUMBER.search(text or "")
        if not number:
            continue
        digits = _SPACES.sub("", number.group(0)).replace("'", "")
        if "." in digits and "," in digits:
            votes.add("." if digits.rfind(".") > digits.rfind(",") else ",")
            continue
        pairs: tuple[tuple[Separator, Separator], ...] = ((".", ","), (",", "."))
        for sep, other in pairs:
            parts = digits.split(sep)
            if len(parts) > 2 and all(len(p) == 3 for p in parts[1:]):
                votes.add(other)  # repeated = grouping, so the other one is the decimal
            elif len(parts) == 2 and len(parts[1]) in (1, 2):
                votes.add(sep)  # 7,99 / 2.5: decimal
    return votes.pop() if len(votes) == 1 else None
