"""Pure scoring helpers for the AI eval runner (no network, unit-tested)."""
from __future__ import annotations

import math
import re
import unicodedata
from collections.abc import Iterable, Sequence


def normalise(text: str) -> str:
    """Lower-case, strip accents and punctuation, collapse spaces ("Bœuf brochette!" → "boeuf brochette")."""
    decomposed = unicodedata.normalize("NFKD", text.replace("œ", "oe").replace("Œ", "oe"))
    ascii_only = "".join(c for c in decomposed if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", ascii_only.lower()).strip()


def singular(word: str) -> str:
    """Very small plural folding for matching ingredient names ("tomatoes" → "tomato")."""
    w = normalise(word)
    for suffix, repl in (("oes", "o"), ("ies", "y"), ("es", "e"), ("s", "")):
        if w.endswith(suffix) and len(w) > len(suffix) + 2:
            return w[: -len(suffix)] + repl
    return w


_STOPWORDS = {"and", "et", "na", "with", "avec", "the", "of", "de", "du", "des", "la", "le", "les", "au", "aux", "n"}


def _tokens(text: str) -> frozenset[str]:
    return frozenset(singular(w) for w in normalise(text).split() if w not in _STOPWORDS)


def names_equal(expected: str, actual: str) -> bool:
    """Same words, ignoring case, accents, punctuation, "and"/"&" and plural endings."""
    e, a = _tokens(expected), _tokens(actual)
    return bool(e) and e == a


def names_match(expected: str, actual: str) -> bool:
    """Equal names, or one name's words contained in the other's ("Chips" ~ "Chips (large)")."""
    e, a = _tokens(expected), _tokens(actual)
    return bool(e) and bool(a) and (e == a or e <= a or a <= e)


def word_error_rate(reference: str, hypothesis: str) -> float:
    """WER = word-level Levenshtein distance / number of reference words."""
    ref = normalise(reference).split()
    hyp = normalise(hypothesis).split()
    if not ref:
        return 0.0 if not hyp else 1.0
    prev = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, start=1):
        cur = [i] + [0] * len(hyp)
        for j, h in enumerate(hyp, start=1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (0 if r == h else 1))
        prev = cur
    return prev[-1] / len(ref)


def percentile(values: Sequence[float], pct: float) -> float | None:
    """Nearest-rank percentile (pct in 0–100); None for no data."""
    if not values:
        return None
    ordered = sorted(values)
    rank = max(1, math.ceil(pct / 100 * len(ordered)))
    return ordered[rank - 1]


def rate(hits: int, total: int) -> float | None:
    return None if total == 0 else hits / total


def match_items(expected: Iterable[str], actual: Iterable[str]) -> dict[str, str]:
    """One-to-one name matching (expected → actual): exact word matches first, then containment."""
    wanted = list(expected)
    remaining = list(actual)
    pairs: dict[str, str] = {}
    for matcher in (names_equal, names_match):
        for e in wanted:
            if e in pairs:
                continue
            for a in remaining:
                if matcher(e, a):
                    pairs[e] = a
                    remaining.remove(a)
                    break
    return pairs


def params_match(expected: dict, actual: dict) -> list[str]:
    """Names of expected params that do not match. `<name>_contains` checks a substring."""
    problems: list[str] = []
    for key, want in expected.items():
        if key.endswith("_contains"):
            field = key[: -len("_contains")]
            if normalise(str(want)) not in normalise(str(actual.get(field, ""))):
                problems.append(field)
            continue
        got = actual.get(key)
        if isinstance(want, (int, float)) and not isinstance(want, bool):
            try:
                if abs(float(got) - float(want)) > 1e-6:
                    problems.append(key)
            except (TypeError, ValueError):
                problems.append(key)
        elif normalise(str(want)) != normalise(str(got if got is not None else "")):
            problems.append(key)
    return problems
