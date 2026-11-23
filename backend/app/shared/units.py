"""Unit registry (Step 2a build step 4): exact conversions, and "ask" instead of a guess.

- Exact: mg, g, kg, lb, oz (mass); ml, cl, dl, l (volume); piece/each/unit, dozen (count).
  Imperial factors are the legal definitions (1 lb = 0.45359237 kg exactly).
- Ask: gallon, quart, pint and fl oz differ between US and UK measures, so they convert
  only when the text says which ("US gallon", "imp. pint"); otherwise status "ask".
- Pack units (bag, sack, carton, crate, tray, box, bunch, case, …) convert only when the size
  is printed ("50 kg bag", "carton of 24") or the ingredient has a pack size; else "ask".

Every result keeps the original quantity and unit next to the converted ones.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

Family = Literal["mass", "volume", "count"]

# Factor to the family's base unit: g (mass), ml (volume), piece (count).
_EXACT: dict[str, tuple[Family, Decimal]] = {
    "mg": ("mass", Decimal("0.001")),
    "g": ("mass", Decimal("1")),
    "kg": ("mass", Decimal("1000")),
    "lb": ("mass", Decimal("453.59237")),
    "oz": ("mass", Decimal("28.349523125")),
    "ml": ("volume", Decimal("1")),
    "cl": ("volume", Decimal("10")),
    "dl": ("volume", Decimal("100")),
    "l": ("volume", Decimal("1000")),
    "piece": ("count", Decimal("1")),
    "dozen": ("count", Decimal("12")),
}
# US and UK (imperial) measures, in ml: ambiguous without a qualifier.
_US_UK: dict[str, tuple[Decimal, Decimal]] = {
    "gallon": (Decimal("3785.411784"), Decimal("4546.09")),
    "quart": (Decimal("946.352946"), Decimal("1136.5225")),
    "pint": (Decimal("473.176473"), Decimal("568.26125")),
    "fl_oz": (Decimal("29.5735295625"), Decimal("28.4130625")),
}
PACK_UNITS = frozenset(
    {"bag", "sack", "carton", "crate", "tray", "box", "bunch", "case", "pack", "packet",
     "bundle", "jerrycan", "basin", "basket", "tin", "can", "bottle", "jar"}
)  # fmt: skip

_ALIASES: dict[str, str] = {
    "milligram": "mg", "milligrams": "mg", "mgs": "mg",
    "gram": "g", "grams": "g", "gramme": "g", "grammes": "g", "gr": "g", "grm": "g",
    "grms": "g", "gm": "g", "gms": "g",
    "kilo": "kg", "kilos": "kg", "kgs": "kg", "kilogram": "kg", "kilograms": "kg",
    "kilogramme": "kg", "kilogrammes": "kg",
    "lbs": "lb", "pound": "lb", "pounds": "lb", "ounce": "oz", "ounces": "oz",
    "millilitre": "ml", "milliliter": "ml", "millilitres": "ml", "milliliters": "ml",
    "centilitre": "cl", "centiliter": "cl", "decilitre": "dl",
    "litre": "l", "liter": "l", "litres": "l", "liters": "l", "ltr": "l", "ltrs": "l", "lt": "l",
    "pc": "piece", "pcs": "piece", "pieces": "piece", "each": "piece", "ea": "piece",
    "unit": "piece", "units": "piece", "piece(s)": "piece", "pce": "piece", "pièce": "piece",
    "pièces": "piece", "u": "piece", "nos": "piece", "no": "piece",
    "dz": "dozen", "doz": "dozen", "dozens": "dozen", "douzaine": "dozen", "douzaines": "dozen",
    "gal": "gallon", "gals": "gallon", "gallons": "gallon", "qt": "quart", "quarts": "quart",
    "pt": "pint", "pints": "pint", "floz": "fl_oz", "fl oz": "fl_oz", "fl.oz": "fl_oz",
    "fl. oz": "fl_oz", "fluid ounce": "fl_oz", "fluid ounces": "fl_oz",
    "bags": "bag", "sacs": "sack", "sac": "sack", "sacks": "sack", "cartons": "carton",
    "ctn": "carton", "ctns": "carton", "crates": "crate", "trays": "tray", "boxes": "box",
    "bunches": "bunch", "cases": "case", "packs": "pack", "packets": "packet", "pkt": "packet",
    "tins": "tin", "cans": "can", "bottles": "bottle", "btl": "bottle", "jars": "jar",
}  # fmt: skip
_US_WORDS = re.compile(r"(?i)\b(us|u\.s\.|american)\b")
_UK_WORDS = re.compile(r"(?i)\b(uk|u\.k\.|imp|imp\.|imperial|british)\b")


@dataclass(frozen=True)
class ParsedUnit:
    """A unit as printed, normalised. `pack_*` is the printed pack size ("50 kg bag")."""

    text: str
    unit: str | None  # canonical code, e.g. "kg", "gallon", "bag"; None if unknown
    measure: Literal["us", "uk"] | None = None
    pack_qty: Decimal | None = None
    pack_unit: str | None = None


@dataclass(frozen=True)
class Conversion:
    status: Literal["ok", "ask", "incompatible", "unknown_unit"]
    original_qty: Decimal
    original_unit: str
    qty: Decimal | None = None  # in the target unit when status is "ok"
    unit: str | None = None
    # What to ask when status is "ask": "us_or_uk" or "pack_size".
    question: str | None = None


def canonical_unit(text: str | None) -> str | None:
    """'Kgs' → 'kg', 'fl. oz' → 'fl_oz', 'cartons' → 'carton'; None if unknown."""
    if not text:
        return None
    t = re.sub(r"\s+", " ", text.strip().lower()).rstrip(".")
    t = _US_WORDS.sub("", _UK_WORDS.sub("", t)).strip()
    if t in _EXACT or t in _US_UK or t in PACK_UNITS:
        return t
    return _ALIASES.get(t)


def parse_unit(text: str | None) -> ParsedUnit:
    """Read a printed unit: '50 kg bag', 'carton of 24', 'US gallon', 'Kgs', '500grm'."""
    raw = (text or "").strip()
    if not raw:
        return ParsedUnit(raw, None)
    measure: Literal["us", "uk"] | None = None
    if _US_WORDS.search(raw):
        measure = "us"
    elif _UK_WORDS.search(raw):
        measure = "uk"
    lowered = raw.lower()
    # "50 kg bag", "bag of 50kg", "carton of 24", "1 carton (24 pcs)"
    pack = next((p for p in PACK_UNITS if re.search(rf"\b{p}s?\b", lowered)), None)
    if pack is None:
        alias_pack = next(
            (
                canonical_unit(w)
                for w in re.findall(r"[a-z]+", lowered)
                if canonical_unit(w) in PACK_UNITS
            ),
            None,
        )
        pack = alias_pack
    if pack is not None:
        size = _pack_size(lowered)
        if size:
            return ParsedUnit(raw, pack, measure, size[0], size[1])
        return ParsedUnit(raw, pack, measure)
    # "500grm", "360 g": a size attached to the unit (a pack of that size).
    sized = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*([a-z][a-z .]*)", lowered)
    if sized and canonical_unit(sized.group(2)):
        return ParsedUnit(
            raw,
            "pack",
            measure,
            Decimal(sized.group(1).replace(",", ".")),
            canonical_unit(sized.group(2)),
        )
    return ParsedUnit(raw, canonical_unit(raw), measure)


_NUM = r"(\d+(?:[.,]\d+)?)"


def parse_pack_size(text: str | None) -> tuple[Decimal, str] | None:
    """A pack size typed by the chef: "50 kg", "24" (pieces), "2,5 l"; None if unreadable."""
    match = re.fullmatch(r"\s*(\d+(?:[.,]\d+)?)\s*([A-Za-z. ]*)\s*", text or "")
    if not match:
        return None
    size = Decimal(match.group(1).replace(",", "."))
    if size <= 0:
        return None
    return size, (match.group(2).strip() or "piece")


def _pack_size(lowered: str) -> tuple[Decimal, str] | None:
    """The printed size of a pack, or None. A number WITH a unit is a size ("50 kg bag",
    "bag 50kg", "carton (24 pcs)"); a bare number is a count of pieces only after "of", "x"
    or in brackets ("carton of 24", "crate x 30", "tray (30)"). A leading count alone
    ("1 carton") is the quantity, not a size."""
    for match in re.finditer(_NUM + r"\s*([a-z][a-z.]*(?: oz)?)", lowered):
        unit = canonical_unit(match.group(2))
        if unit is not None and unit not in PACK_UNITS and unit != "pack":
            return Decimal(match.group(1).replace(",", ".")), unit
    bare = re.search(r"(?:\bof|\bx|\u00d7|\()\s*" + _NUM + r"\s*\)?\s*$", lowered)
    if bare:
        return Decimal(bare.group(1).replace(",", ".")), "piece"
    return None


def _to_base(unit: str, measure: Literal["us", "uk"] | None) -> tuple[Family, Decimal] | None | str:
    """(family, factor) for a unit; "ask" when it is US/UK without a qualifier."""
    if unit in _EXACT:
        return _EXACT[unit]
    if unit in _US_UK:
        if measure is None:
            return "ask"
        us, uk = _US_UK[unit]
        return ("volume", us if measure == "us" else uk)
    return None


def convert(
    qty: Decimal,
    from_text: str,
    to_unit: str,
    *,
    pack_size: tuple[Decimal, str] | None = None,
) -> Conversion:
    """Convert `qty` of the printed unit `from_text` into `to_unit` (the kitchen's unit).

    `pack_size` is the ingredient's own pack definition (e.g. (50, "kg") for a bag), used when
    the document doesn't print the size. Never guesses: US/UK and unsized packs → "ask".
    """
    original = Conversion("unknown_unit", qty, from_text)
    parsed = parse_unit(from_text)
    target = canonical_unit(to_unit)
    if parsed.unit is None or target is None:
        if from_text.strip().lower() == to_unit.strip().lower():
            return Conversion("ok", qty, from_text, qty, to_unit)  # same unknown unit, 1:1
        return original
    amount, unit, measure = qty, parsed.unit, parsed.measure
    if unit in PACK_UNITS or unit == "pack":
        if unit == target:
            return Conversion("ok", qty, from_text, qty, to_unit)
        size = (parsed.pack_qty, parsed.pack_unit) if parsed.pack_qty else pack_size
        if not size or size[0] is None or size[1] is None:
            return Conversion("ask", qty, from_text, question="pack_size")
        inner = canonical_unit(size[1])
        if inner is None:
            return Conversion("ask", qty, from_text, question="pack_size")
        amount, unit = qty * Decimal(size[0]), inner
    if unit == target and measure is None:
        return Conversion("ok", qty, from_text, amount, to_unit)
    src = _to_base(unit, measure)
    dst = _to_base(target, None)
    if src == "ask":
        return Conversion("ask", qty, from_text, question="us_or_uk")
    if dst == "ask":
        return Conversion("ask", qty, from_text, question="us_or_uk")
    if src is None or dst is None or not isinstance(src, tuple) or not isinstance(dst, tuple):
        return Conversion("incompatible", qty, from_text)
    if src[0] != dst[0]:
        return Conversion("incompatible", qty, from_text)
    return Conversion("ok", qty, from_text, amount * src[1] / dst[1], to_unit)
