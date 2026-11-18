"""Phase 8 parity grading: pure functions, no network, unit-tested (tests/test_grading.py).

Every rule here is documented in ai-evals/PARITY.md. Change both together.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Iterable, Sequence
from decimal import Decimal, InvalidOperation
from difflib import SequenceMatcher
from typing import Any

from evallib.metrics import normalise, params_match

FUZZY_THRESHOLD = 0.9


# ── Names ─────────────────────────────────────────────────────────────────────


def similarity(a: str, b: str) -> float:
    """Similarity (0-1) of the normalised names (case, accents and punctuation ignored)."""
    na, nb = normalise(a), normalise(b)
    if not na or not nb:
        return 0.0
    return SequenceMatcher(None, na, nb).ratio()


def match_names(
    expected: Sequence[str], actual: Sequence[str], threshold: float = FUZZY_THRESHOLD
) -> dict[int, int]:
    """One-to-one matching expected[i] -> actual[j]: best similarity first, pairs >= threshold."""
    pairs = sorted(
        ((similarity(e, a), i, j) for i, e in enumerate(expected) for j, a in enumerate(actual)),
        reverse=True,
    )
    out: dict[int, int] = {}
    used: set[int] = set()
    for score, i, j in pairs:
        if score < threshold:
            break
        if i in out or j in used:
            continue
        out[i] = j
        used.add(j)
    return out


# ── Numbers ───────────────────────────────────────────────────────────────────


def to_decimal(value: Any) -> Decimal | None:
    """'25', '2.5', '1,500', '1 500', 25 → Decimal; None when there is no number."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, int | float | Decimal):
        return Decimal(str(value))
    found = extract_numbers(str(value))
    return found[0] if found else None


_TIME = re.compile(r"\b\d{1,2}:\d{2}\b")
_ISO_DATE = re.compile(r"\b\d{4}-\d{2}-\d{2}\b")
_NUMBER = re.compile(r"\d{1,3}(?:[ \u202f\u00a0,.]\d{3})+(?![\d])|\d+(?:[.,]\d+)?")


def extract_numbers(text: str) -> list[Decimal]:
    """Numbers in free text. Times (14:05) and ISO dates are removed first; '1,500', '1 500'
    and '1.500' (thousands) read as 1500; '2.5' and '2,5' read as 2.5."""
    text = _ISO_DATE.sub(" ", _TIME.sub(" ", text))
    out: list[Decimal] = []
    for raw in _NUMBER.findall(text):
        compact = raw.replace("\u202f", " ").replace("\u00a0", " ")
        if re.fullmatch(r"\d{1,3}(?:[ ,.]\d{3})+", compact):
            compact = re.sub(r"[ ,.]", "", compact)
        else:
            compact = compact.replace(",", ".")
        try:
            out.append(Decimal(compact).normalize())
        except InvalidOperation:
            continue
    return out


def invented_numbers(text: str, allowed: Iterable[Decimal]) -> list[Decimal]:
    """Numbers in a reply that come from neither the chef's messages nor the kitchen data."""
    allowed_set = {Decimal(a).normalize() for a in allowed} | {Decimal(0), Decimal(1)}
    return [n for n in extract_numbers(text) if n not in allowed_set]


# ── Language ──────────────────────────────────────────────────────────────────

_WORDS = {
    "en": {
        "the",
        "you",
        "your",
        "is",
        "are",
        "how",
        "many",
        "what",
        "to",
        "of",
        "have",
        "sold",
        "today",
        "please",
        "confirm",
        "would",
        "will",
        "which",
        "did",
        "do",
        "we",
        "it",
        "for",
        "this",
        "that",
        "with",
        "in",
        "on",
        "can",
        "i",
        "dont",
        "data",
    },
    "fr": {
        "le",
        "la",
        "les",
        "des",
        "du",
        "vous",
        "votre",
        "est",
        "sont",
        "combien",
        "quel",
        "quelle",
        "aujourd",
        "hui",
        "je",
        "pour",
        "avez",
        "vendu",
        "vendues",
        "veuillez",
        "souhaitez",
        "pas",
        "une",
        "un",
        "dans",
        "nous",
        "avons",
        "il",
        "ce",
        "cette",
        "sur",
    },
    "rw": {
        "ni",
        "na",
        "ya",
        "za",
        "kuri",
        "uyu",
        "munsi",
        "ibiro",
        "amasahani",
        "angahe",
        "wagurishije",
        "mwagurishije",
        "twagurishije",
        "ese",
        "kugira",
        "ngo",
        "iki",
        "ibyo",
        "cyangwa",
        "mu",
        "ku",
        "bingahe",
        "kandi",
        "andika",
        "iyi",
        "ufite",
        "mufite",
        "hari",
        "nta",
        "ntabwo",
        "dufite",
        "byinshi",
        "bya",
        "cya",
        "rya",
        "wa",
        "ba",
        "ko",
        "nde",
    },
}


def detect_language(text: str) -> str:
    """Heuristic EN/FR/RW detector from function words. 'unknown' when the evidence is weak
    (fewer than 2 hits, or a tie); those replies are listed for manual review."""
    words = normalise(text).split()
    scores = {lang: sum(1 for w in words if w in vocab) for lang, vocab in _WORDS.items()}
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    (best, top), (_, second) = ranked[0], ranked[1]
    if top < 2 or top == second:
        return "unknown"
    return best


# ── Classification ────────────────────────────────────────────────────────────


def grade_classify(expected_kind: str, body: dict[str, Any] | None) -> dict[str, Any]:
    """Exact label. 'classify_unavailable' counts as wrong (the chef has to pick)."""
    if body is None:
        return {"valid": False, "correct": False, "unavailable": False, "confidence": None}
    unavailable = body.get("status") == "classify_unavailable"
    return {
        "valid": True,
        "correct": (not unavailable) and body.get("kind") == expected_kind,
        "unavailable": unavailable,
        "confidence": body.get("confidence"),
        "kind": body.get("kind"),
    }


def calibration(records: Sequence[tuple[float, bool]], bins: int = 5) -> dict[str, Any]:
    """Brier score and expected calibration error (ECE, equal-width bins): confidence vs correct."""
    if not records:
        return {"brier": None, "ece": None, "bins": []}
    brier = sum((c - (1.0 if ok else 0.0)) ** 2 for c, ok in records) / len(records)
    table, ece = [], 0.0
    for b in range(bins):
        lo, hi = b / bins, (b + 1) / bins
        rows = [(c, ok) for c, ok in records if (lo <= c < hi) or (b == bins - 1 and c == 1.0)]
        if not rows:
            continue
        acc = sum(ok for _, ok in rows) / len(rows)
        conf = sum(c for c, _ in rows) / len(rows)
        ece += len(rows) / len(records) * abs(acc - conf)
        table.append(
            {
                "range": f"{lo:.1f}-{hi:.1f}",
                "n": len(rows),
                "accuracy": acc,
                "mean_confidence": conf,
            }
        )
    return {"brier": brier, "ece": ece, "bins": table}


# ── Menu ──────────────────────────────────────────────────────────────────────


def grade_menu(expected_items: Sequence[dict], body: dict[str, Any] | None) -> dict[str, Any]:
    """Item names: normalised fuzzy match ≥ 0.9, one-to-one. Price: exact integer RWF
    (expected null must come back null). Category: exact, only where the expectation sets one.
    Unmatched expected items count as wrong price and wrong category."""
    if body is None:
        return {"valid": False}
    actual = body.get("items") or []
    pairs = match_names([e["name"] for e in expected_items], [a.get("name", "") for a in actual])
    price_ok = sum(
        1 for i, j in pairs.items() if actual[j].get("price") == expected_items[i].get("price")
    )
    with_cat = [i for i, e in enumerate(expected_items) if e.get("category")]
    cat_ok = sum(
        1
        for i in with_cat
        if i in pairs and actual[pairs[i]].get("category") == expected_items[i]["category"]
    )
    misses = [expected_items[i]["name"] for i in range(len(expected_items)) if i not in pairs]
    wrong_price = [
        {
            "name": expected_items[i]["name"],
            "expected": expected_items[i].get("price"),
            "got": actual[j].get("price"),
        }
        for i, j in pairs.items()
        if actual[j].get("price") != expected_items[i].get("price")
    ]
    return {
        "valid": True,
        "expected": len(expected_items),
        "returned": len(actual),
        "matched": len(pairs),
        "recall": _rate(len(pairs), len(expected_items)),
        "precision": _rate(len(pairs), len(actual)),
        "price_accuracy": _rate(price_ok, len(expected_items)),
        "category_accuracy": _rate(cat_ok, len(with_cat)),
        "missed": misses,
        "wrong_price": wrong_price,
    }


# ── Dish ──────────────────────────────────────────────────────────────────────


def grade_dish(
    expected_ingredients: Sequence[str], body: dict[str, Any] | None, kitchen: dict[str, str]
) -> dict[str, Any]:
    """Ingredient precision and recall. A suggested ingredient linked to a kitchen ingredient
    (ingredient_id) is read as that ingredient's name; otherwise its own name. Names match with
    the same fuzzy rule as menus. `link_rate`: expected ingredients that exist in the kitchen
    and were linked by id (what lets the recipe be created in one tap)."""
    if body is None:
        return {"valid": False}
    suggested = body.get("ingredients") or []
    names = [kitchen.get(str(s.get("ingredient_id")), s.get("name", "")) for s in suggested]
    pairs = match_names(list(expected_ingredients), names)
    kitchen_names = {normalise(n): i for i, n in kitchen.items()}
    expected_in_kitchen = [e for e in expected_ingredients if normalise(e) in kitchen_names]
    linked_ids = {str(s.get("ingredient_id")) for s in suggested if s.get("ingredient_id")}
    linked = sum(1 for e in expected_in_kitchen if kitchen_names[normalise(e)] in linked_ids)
    return {
        "valid": True,
        "precision": _rate(len(pairs), len(suggested)),
        "recall": _rate(len(pairs), len(expected_ingredients)),
        "link_rate": _rate(linked, len(expected_in_kitchen)),
        "missed": [e for i, e in enumerate(expected_ingredients) if i not in pairs],
        "extra": [n for j, n in enumerate(names) if j not in pairs.values()],
        "dish_name": body.get("dish_name"),
    }


# ── Delivery note / receipt ───────────────────────────────────────────────────


def grade_document(expected_lines: Sequence[dict], body: dict[str, Any] | None) -> dict[str, Any]:
    """Line items matched by name (fuzzy ≥ 0.9). Quantity: exact number. Prices: unit price and
    line total each exact where the expectation gives them (both must match when both are given)."""
    if body is None:
        return {"valid": False}
    actual = body.get("lines") or []
    pairs = match_names([e["name"] for e in expected_lines], [a.get("name", "") for a in actual])
    qty_ok = sum(
        1
        for i, j in pairs.items()
        if to_decimal(actual[j].get("quantity")) == to_decimal(expected_lines[i].get("quantity"))
    )
    priced = [
        i
        for i, e in enumerate(expected_lines)
        if e.get("unit_price") is not None or e.get("line_total") is not None
    ]

    def price_ok(i: int) -> bool:
        if i not in pairs:
            return False
        e, a = expected_lines[i], actual[pairs[i]]
        return all(
            e.get(k) is None or to_decimal(a.get(k)) == to_decimal(e.get(k))
            for k in ("unit_price", "line_total")
        )

    return {
        "valid": True,
        "line_recall": _rate(len(pairs), len(expected_lines)),
        "line_precision": _rate(len(pairs), len(actual)),
        "quantity_accuracy": _rate(qty_ok, len(expected_lines)),
        "price_accuracy": _rate(sum(1 for i in priced if price_ok(i)), len(priced)),
        "missed": [e["name"] for i, e in enumerate(expected_lines) if i not in pairs],
    }


# ── Assistant ─────────────────────────────────────────────────────────────────


def response_type(body: dict[str, Any] | None) -> str | None:
    if body is None:
        return None
    if body.get("proposal"):
        return "proposal"
    if body.get("clarification"):
        return "clarification"
    return "answer"


def grade_assistant(
    case: dict[str, Any],
    body: dict[str, Any] | None,
    *,
    http_status: int,
    error_code: str | None,
    allowed_numbers: Iterable[Decimal],
    params_validator: Callable[[str, dict], bool],
) -> dict[str, Any]:
    """Checks (each None when it does not apply):
    - type: proposal / clarification / answer as expected (out-of-domain may also be refused);
    - action + params_valid + params: right action, params valid against the typed model,
      expected values match;
    - one_question: an ambiguous request gets exactly one short question (≤ 1 '?'), and a
      clear request is NOT answered with a question;
    - language: the reply is in the request language (heuristic; 'unknown' → manual review);
    - grounded: no number in the reply that is not in the chef's messages or the kitchen data;
    - mentions: answers that must quote a figure contain one of the accepted spellings.
    A case passes when every applicable check is true."""
    expect = case["expect"]
    want = expect["type"]
    refused = http_status == 422 and error_code == "AI_REFUSED"
    if body is None and not (refused and expect.get("out_of_domain")):
        return {"valid": False, "passed": False, "checks": {}, "http": http_status}
    got = "answer" if refused else response_type(body)
    checks: dict[str, bool | None] = {"type": got == want}
    proposal = (body or {}).get("proposal") or {}
    clar = (body or {}).get("clarification") or {}
    if want == "proposal":
        action = proposal.get("action_type")
        params = proposal.get("params") or {}
        checks["action"] = action == expect.get("action_type")
        checks["params_valid"] = bool(action) and params_validator(action, params)
        checks["params"] = not params_match(expect.get("params", {}), params) if action else False
    if want == "clarification":
        question = clar.get("question") or ""
        checks["one_question"] = (
            got == "clarification" and question.count("?") <= 1 and not proposal
        )
    else:
        checks["one_question"] = got != "clarification"
    text = " ".join(filter(None, [(body or {}).get("reply_text"), clar.get("question")]))
    language = detect_language(text) if text else "unknown"
    checks["language"] = None if language == "unknown" or refused else language == case["language"]
    extra = invented_numbers(text, allowed_numbers) if not refused else []
    checks["grounded"] = not extra
    if expect.get("mentions_any"):
        checks["mentions"] = any(normalise(m) in normalise(text) for m in expect["mentions_any"])
    passed = all(v for v in checks.values() if v is not None)
    return {
        "valid": True,
        "passed": passed,
        "checks": checks,
        "type": got,
        "language": language,
        "invented_numbers": [str(n) for n in extra],
        "http": http_status,
    }


def _rate(hits: int, total: int) -> float | None:
    return None if total == 0 else hits / total
