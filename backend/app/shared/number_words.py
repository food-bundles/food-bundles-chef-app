"""Amounts written in words (English and French), used only to cross-check a printed total.

`parse_amount_words("Seventy one thousand two hundred naira only")` → Decimal("71200").
Anything it cannot read fully returns None, and the caller then SKIPS the check (never
fails it): a partial reading must not produce a false mismatch.
"""

from __future__ import annotations

import re
import unicodedata
from decimal import Decimal

_EN_UNITS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40, "fourty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
}  # fmt: skip
_FR_UNITS = {
    "zero": 0, "un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5, "six": 6,
    "sept": 7, "huit": 8, "neuf": 9, "dix": 10, "onze": 11, "douze": 12, "treize": 13,
    "quatorze": 14, "quinze": 15, "seize": 16, "vingt": 20, "vingts": 20, "trente": 30,
    "quarante": 40, "cinquante": 50, "soixante": 60, "septante": 70, "huitante": 80,
    "octante": 80, "nonante": 90,
}  # fmt: skip
_HUNDRED = {"hundred": 100, "cent": 100, "cents": 100}
_SCALES = {
    "thousand": 1_000, "mille": 1_000, "mil": 1_000,
    "million": 1_000_000, "millions": 1_000_000,
    "billion": 1_000_000_000, "milliard": 1_000_000_000, "milliards": 1_000_000_000,
}  # fmt: skip
# Joining words and the currency / "only" words that surround amounts on invoices.
_FILLER = {
    "and", "et", "only", "seulement", "uniquement", "the", "sum", "of", "amount", "montant",
    "total", "de", "du", "des", "la", "le", "a", "an",
}  # fmt: skip
_CURRENCY_WORDS = {
    "franc", "francs", "frw", "rwf", "rwandan", "rwanda", "rwandais", "dollar", "dollars",
    "usd", "euro", "euros", "eur", "shilling", "shillings", "naira", "kobo", "pound",
    "pounds", "cfa", "fcfa", "cedi", "cedis", "rand", "birr",
}  # fmt: skip
_CENT_WORDS = {"cent", "cents", "centime", "centimes", "kobo", "pence", "penny"}


def _normalise(text: str) -> list[str]:
    folded = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return [t for t in re.split(r"[\s\-,./]+", folded) if t]


def _read_integer(tokens: list[str]) -> int | None:
    """Read number words into an integer; None if any token is not a number word."""
    if not tokens:
        return None
    total = 0
    current = 0
    seen = False
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        # French 70-99: soixante-dix…dix-neuf, quatre-vingt(s)[-dix…]
        if tok == "quatre" and i + 1 < len(tokens) and tokens[i + 1] in ("vingt", "vingts"):
            current += 80
            i += 2
            seen = True
            continue
        if tok in _EN_UNITS or tok in _FR_UNITS:
            value = _EN_UNITS.get(tok, _FR_UNITS.get(tok, 0))
            current += value
            seen = True
        elif tok in _HUNDRED:
            current = (current or 1) * 100
            seen = True
        elif tok in _SCALES:
            total += (current or 1) * _SCALES[tok]
            current = 0
            seen = True
        elif tok in _FILLER:
            pass
        else:
            return None
        i += 1
    return total + current if seen else None


def parse_amount_words(text: str | None) -> Decimal | None:
    """Amount in words → Decimal, or None if any part is unreadable (then skip the check).

    Handles EN ("one thousand two hundred and fifty"), FR ("mille deux cent cinquante",
    "quatre-vingt-dix", "soixante et onze"), currency words and "only", and a cents part
    ("... dollars and fifty cents" → .50).
    """
    if not text or not text.strip():
        return None
    tokens = _normalise(text)
    # Split at the currency word: before = major units, after = an optional cents part.
    major: list[str] = []
    minor: list[str] = []
    target = major
    for tok in tokens:
        if tok in _CURRENCY_WORDS:
            target = minor
            continue
        target.append(tok)
    has_cents = any(t in _CENT_WORDS for t in minor)
    minor = [t for t in minor if t not in _CENT_WORDS]
    if not has_cents and any(t not in _FILLER for t in minor):
        # Number words after the currency word without "cents": unclear, skip the check.
        return None
    whole = _read_integer(major)
    if whole is None:
        return None
    if has_cents:
        cents = _read_integer(minor)
        if cents is None or cents >= 100:
            return None
        return Decimal(whole) + Decimal(cents) / 100
    return Decimal(whole)
