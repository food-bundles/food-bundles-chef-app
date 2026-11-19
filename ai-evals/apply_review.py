"""Apply a corrected review.csv back to the cases and mark them verified.

    python ai-evals/apply_review.py                 # dry run: shows what would change
    python ai-evals/apply_review.py --write         # writes expected.json files

Rules (one CSV row per value, see review_sheet.py):
- `case` row: kind, language, tags (separated by `;`), dish_name and category (dish cases),
  notes. Put `yes` in `exclude` to keep the case out of the evals (status "excluded").
- `item` rows (menus): name, price, price_text, category.
- `ingredient` rows (dishes): name.
- `line` rows (documents): name, quantity, unit, unit_price, line_total, price_text.
- Delete a row to remove that value; add a row (same case_id and row_type) to add one.
- Empty cell = null. `unreadable` is kept as written (left out of scoring).
Every case present in the CSV becomes status "verified" (or "excluded"); the 'uncertain'
list is dropped because the reviewer has decided. Cases missing from the CSV are untouched.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

SPECIAL = {"unreadable"}
CATEGORIES = {"main", "side", "drink", "dessert"}
KINDS = {"menu", "dish", "receipt", "delivery_note", "stock_shelf", "other"}


def text(value: str) -> str | None:
    value = (value or "").strip()
    return value or None


def number(value: str, *, whole: bool) -> int | float | str | None:
    """'' → None; 'unreadable' kept; '1,500' / '1500' → 1500; '0.5' → 0.5."""
    value = (value or "").strip()
    if not value:
        return None
    if value.lower() in SPECIAL:
        return value.lower()
    cleaned = (
        value.replace(" ", "").replace(",", "") if whole else value.replace(",", ".")
    )
    try:
        d = Decimal(cleaned)
    except InvalidOperation:
        raise ValueError(
            f"not a number: {value!r} (use a number, empty or unreadable)"
        ) from None
    if whole:
        if d != d.to_integral_value():
            raise ValueError(
                f"price must be a whole number here: {value!r} (amount + currency arrives in Step 2a)"
            )
        return int(d)
    return int(d) if d == d.to_integral_value() else float(d)


def build(case_rows: list[dict], previous: dict) -> dict:
    head = next((r for r in case_rows if r["row_type"] == "case"), None)
    if head is None:
        raise ValueError("missing the 'case' row")
    feature = head["feature"]
    kind = text(head["kind"])
    if kind not in KINDS:
        raise ValueError(f"kind must be one of {sorted(KINDS)}, got {kind!r}")
    out: dict = {"kind": kind}
    if text(head["language"]):
        out["language"] = text(head["language"])
    out["tags"] = [t.strip() for t in (head["tags"] or "").split(";") if t.strip()]
    if feature == "dish":
        out["dish_name"] = text(head["dish_name"])
        out["category"] = _category(head["category"])
        out["ingredients"] = [
            text(r["name"])
            for r in case_rows
            if r["row_type"] == "ingredient" and text(r["name"])
        ]
    if feature == "menu":
        out["items"] = [
            _drop_empty_text(
                {
                    "name": text(r["name"]) or "unreadable",
                    "price": number(r["price"], whole=True),
                    "price_text": text(r["price_text"]),
                    "category": _category(r["category"]),
                }
            )
            for r in case_rows
            if r["row_type"] == "item"
        ]
    if feature == "document":
        out["lines"] = [
            _drop_empty_text(
                {
                    "name": text(r["name"]) or "unreadable",
                    "quantity": number(r["quantity"], whole=False),
                    "unit": text(r["unit"]),
                    "unit_price": number(r["unit_price"], whole=True),
                    "line_total": number(r["line_total"], whole=True),
                    "price_text": text(r["price_text"]),
                }
            )
            for r in case_rows
            if r["row_type"] == "line"
        ]
        if "total" in previous:
            out["total"] = previous["total"]
    if text(head["notes"]):
        out["notes"] = text(head["notes"])
    excluded = (head.get("exclude") or "").strip().lower() in (
        "yes",
        "y",
        "x",
        "true",
        "1",
    )
    for key in ("source_file", "image_size", "metadata_stripped", "drafted", "consent"):
        if key in previous:
            out[key] = previous[key]
    out["status"] = "excluded" if excluded else "verified"
    out["verified"] = datetime.now(UTC).date().isoformat()
    return out


def _drop_empty_text(entry: dict) -> dict:
    """price_text is optional: leave it out when the cell is empty."""
    if entry.get("price_text") is None:
        entry.pop("price_text", None)
    return entry


def _category(value: str) -> str | None:
    value = text(value)
    if value is None:
        return None
    if value not in CATEGORIES:
        raise ValueError(
            f"category must be one of {sorted(CATEGORIES)} or empty, got {value!r}"
        )
    return value


def main() -> int:
    from parity import validate_expected

    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--csv", type=Path, default=ROOT / "review.csv")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    by_case: dict[str, list[dict]] = defaultdict(list)
    with args.csv.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            if (row.get("case_id") or "").strip():
                by_case[row["case_id"].strip()].append(row)

    errors = 0
    for case_id, rows in by_case.items():
        feature, _, name = case_id.partition("/")
        exp_file = ROOT / "cases" / feature / name / "expected.json"
        if not exp_file.exists():
            print(f"ERROR {case_id}: no such case folder")
            errors += 1
            continue
        previous = json.loads(exp_file.read_text(encoding="utf-8"))
        try:
            new = build(rows, previous)
            problem = validate_expected(feature, new)
            if problem:
                raise ValueError(problem)
        except ValueError as exc:
            print(f"ERROR {case_id}: {exc}")
            errors += 1
            continue
        changed = {
            k for k in set(previous) | set(new) if previous.get(k) != new.get(k)
        } - {"verified", "status", "uncertain"}
        print(
            f"{case_id}: {previous.get('status')} -> {new['status']}"
            + (f" (changed: {', '.join(sorted(changed))})" if changed else "")
        )
        if args.write:
            exp_file.write_text(
                json.dumps(new, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
    if errors:
        print(f"{errors} case(s) not applied; fix the CSV and run again.")
        return 1
    if not args.write:
        print("Dry run. Re-run with --write to save.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
