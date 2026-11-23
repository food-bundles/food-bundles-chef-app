"""Build the answer-key review sheet: ai-evals/review.html and ai-evals/review.csv.

    python ai-evals/review_sheet.py

review.html shows every image case beside its expected.json (feature, kind, items, prices,
categories, ingredients, line items, document totals), with values that need a decision
highlighted: 'unreadable', open currencies or amounts (the app must ask), the questions the
app should ask (`should_clarify`), arithmetic flags, uncertain ingredients and flagged notes.
review.csv holds the same answers one row per value, to correct in a spreadsheet and apply
with apply_review.py. Both files are local (git-ignored): they show real photos.

Answer-key format 2 (Step 2a): every price is {text, amount, currency}: `text` exactly as
printed, `amount` a decimal (empty = the app must ask, e.g. "1.500"), `currency` ISO 4217
(empty = not printed or ambiguous like "$": the app must ask). See cases/README.md.
"""

from __future__ import annotations

import csv
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FEATURES = ("menu", "dish", "document", "junk")
MONEY_FIELDS = ("price", "unit_price", "line_total", "total")
COLUMNS = [
    "case_id",
    "feature",
    "row_type",
    "kind",
    "kitchen",
    "language",
    "tags",
    "should_clarify",
    "dish_name",
    "category",
    "name",
    *(f"{m}_{part}" for m in MONEY_FIELDS for part in ("text", "amount", "currency")),
    "quantity",
    "unit",
    "arithmetic_flags",
    "exclude",
    "notes",
]
SPECIAL = {"unreadable"}


def load_cases() -> list[dict]:
    cases = []
    for feature in FEATURES:
        for folder in sorted((ROOT / "cases" / feature).glob("*/")):
            exp_file = folder / "expected.json"
            if exp_file.exists():
                cases.append(
                    {
                        "id": f"{feature}/{folder.name}",
                        "feature": feature,
                        "folder": folder,
                        "expected": json.loads(exp_file.read_text(encoding="utf-8")),
                    }
                )
    return cases


def cell(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    if isinstance(value, list):
        return "; ".join(str(v) for v in value)
    return str(value)


def money_cells(prefix: str, value: object) -> dict[str, object]:
    """A format-2 price as three cells; 'unreadable' goes in the amount cell."""
    if value == "unreadable":
        return {f"{prefix}_amount": "unreadable"}
    if isinstance(value, dict):
        return {
            f"{prefix}_text": value.get("text"),
            f"{prefix}_amount": value.get("amount"),
            f"{prefix}_currency": value.get("currency"),
        }
    if value is not None:  # a format-1 whole-RWF number
        return {f"{prefix}_amount": value, f"{prefix}_currency": "RWF"}
    return {}


def csv_rows(case: dict) -> list[dict]:
    e, f = case["expected"], case["feature"]
    notes = e.get("notes", "")
    if e.get("uncertain"):
        notes = (notes + " UNCERTAIN: " + "; ".join(e["uncertain"])).strip()
    head: dict[str, object] = {
        "case_id": case["id"],
        "feature": f,
        "row_type": "case",
        "kind": e.get("kind"),
        "kitchen": e.get("kitchen", "rwf"),
        "language": e.get("language", ""),
        "tags": e.get("tags", []),
        "should_clarify": e.get("should_clarify", []),
        "dish_name": e.get("dish_name", ""),
        "category": e.get("category", "") if f == "dish" else "",
        "exclude": "",
        "notes": notes,
    }
    if f == "document":
        head.update(money_cells("total", e.get("total")))
        head["arithmetic_flags"] = e.get("arithmetic_flags", [])
    rows = [head]
    for item in e.get("items", []):
        rows.append(
            {
                "case_id": case["id"],
                "feature": f,
                "row_type": "item",
                "name": item.get("name"),
                "category": item.get("category"),
                "should_clarify": item.get("should_clarify", []),
                **money_cells("price", item.get("price")),
            }
        )
    for name in e.get("ingredients", []):
        rows.append(
            {
                "case_id": case["id"],
                "feature": f,
                "row_type": "ingredient",
                "name": name,
            }
        )
    for line in e.get("lines", []):
        rows.append(
            {
                "case_id": case["id"],
                "feature": f,
                "row_type": "line",
                "name": line.get("name"),
                "quantity": line.get("quantity"),
                "unit": line.get("unit"),
                "should_clarify": line.get("should_clarify", []),
                **money_cells("unit_price", line.get("unit_price")),
                **money_cells("line_total", line.get("line_total")),
            }
        )
    return [{k: cell(r.get(k)) for k in COLUMNS} for r in rows]


def mark(value: object) -> str:
    text = html.escape(cell(value))
    if cell(value) in SPECIAL:
        return f'<span class="flag">{text}</span>'
    if value is None or text == "":
        return '<span class="null">null</span>'
    return text


def money_html(value: object) -> str:
    """'7,99 €' → 7.99 EUR; open amount or currency highlighted (the app must ask)."""
    if value is None:
        return '<span class="null">no price</span>'
    if value == "unreadable":
        return '<span class="flag">unreadable</span>'
    if not isinstance(value, dict):
        return f"{html.escape(cell(value))} RWF"
    amount = value.get("amount")
    currency = value.get("currency")
    parts = [
        html.escape(cell(amount)) if amount is not None else '<span class="ask">amount: ask</span>',
        html.escape(cell(currency)) if currency else '<span class="ask">currency: ask</span>',
    ]
    printed = html.escape(cell(value.get("text")))
    return f'<span class="printed">{printed}</span> → ' + " ".join(parts)


def chips(kinds: object) -> str:
    items = kinds if isinstance(kinds, list) else []
    if not items:
        return '<span class="null">none</span>'
    return " ".join(f'<span class="chip">{html.escape(str(k))}</span>' for k in items)


def case_html(case: dict) -> str:
    e, f = case["expected"], case["feature"]
    img = case["folder"].relative_to(ROOT).as_posix() + "/image.jpg"
    head = (
        f"<h2 id=\"{html.escape(case['id'])}\">{html.escape(case['id'])} "
        f"<span class=\"status {html.escape(e.get('status', ''))}\">{html.escape(e.get('status', ''))}</span></h2>"
    )
    meta = [
        f"<b>kind</b> {mark(e.get('kind'))}",
        f"<b>kitchen</b> {mark(e.get('kitchen', 'rwf'))}",
        f"<b>language</b> {mark(e.get('language', 'en'))}",
        f"<b>tags</b> {html.escape(', '.join(e.get('tags', [])))}",
        f"<b>source</b> {html.escape(e.get('source_file', ''))} ({'x'.join(map(str, e.get('image_size', [])))})",
    ]
    if f in ("menu", "document"):
        meta.append(f"<b>should ask</b> {chips(e.get('should_clarify', []))}")
    if f == "dish":
        meta += [
            f"<b>dish</b> {mark(e.get('dish_name'))}",
            f"<b>category</b> {mark(e.get('category'))}",
        ]
    body = "<p>" + " · ".join(meta) + "</p>"
    if e.get("items"):
        body += "<table><tr><th>#</th><th>item</th><th>price (as printed → amount currency)</th><th>category</th></tr>"
        for i, it in enumerate(e["items"], 1):
            body += (
                f"<tr><td>{i}</td><td>{mark(it.get('name'))}</td><td>{money_html(it.get('price'))}</td>"
                f"<td>{mark(it.get('category'))}</td></tr>"
            )
        body += "</table>"
    if e.get("ingredients"):
        body += (
            "<p><b>ingredients</b>: "
            + ", ".join(mark(x) for x in e["ingredients"])
            + "</p>"
        )
    if e.get("uncertain"):
        body += (
            '<p class="warn"><b>uncertain</b>: '
            + "; ".join(html.escape(x) for x in e["uncertain"])
            + "</p>"
        )
    if e.get("lines"):
        body += (
            "<table><tr><th>#</th><th>line</th><th>qty</th><th>unit</th><th>unit price</th>"
            "<th>line total</th></tr>"
        )
        for i, ln in enumerate(e["lines"], 1):
            body += (
                f"<tr><td>{i}</td><td>{mark(ln.get('name'))}</td><td class=\"num\">{mark(ln.get('quantity'))}</td>"
                f"<td>{mark(ln.get('unit'))}</td><td>{money_html(ln.get('unit_price'))}</td>"
                f"<td>{money_html(ln.get('line_total'))}</td></tr>"
            )
        body += "</table>"
    if f == "document":
        body += f"<p><b>document total</b>: {money_html(e.get('total'))}</p>"
        body += f"<p><b>arithmetic flags expected</b>: {chips(e.get('arithmetic_flags', []))}</p>"
    if e.get("notes"):
        body += f"<p class=\"notes\">{html.escape(e['notes'])}</p>"
    return (
        f"<section class=\"case\"><div class=\"img\"><a href=\"{img}\" target=\"_blank\">"
        f"<img src=\"{img}\" alt=\"{html.escape(case['id'])}\"></a></div><div class=\"key\">{head}{body}</div></section>"
    )


STYLE = """
:root{--bg:#fafaf7;--fg:#1b1f1c;--muted:#5c665f;--line:#d9ded9;--flag:#fff1c2;--flagfg:#6b4e00;--warn:#b54708;--ok:#0e8438;--ask:#e6f0ff;--askfg:#1d4ed8;--chip:#eef2ee}
@media (prefers-color-scheme:dark){:root{--bg:#121512;--fg:#e8ece9;--muted:#9aa59d;--line:#2c332e;--flag:#4a3b07;--flagfg:#ffe08a;--warn:#f79009;--ok:#4ade80;--ask:#172554;--askfg:#93c5fd;--chip:#1f2a22}}
body{margin:0;padding:16px max(16px,env(safe-area-inset-left));background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif}
h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:0 0 8px}
.summary{color:var(--muted);margin-bottom:16px}
.case{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:16px;padding:16px 0;border-top:1px solid var(--line)}
@media (max-width:760px){.case{grid-template-columns:1fr}}
.img img{max-width:100%;border:1px solid var(--line);border-radius:6px}
table{border-collapse:collapse;width:100%;margin:8px 0} th,td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
.num{text-align:right;font-variant-numeric:tabular-nums}
.flag{background:var(--flag);color:var(--flagfg);padding:0 4px;border-radius:3px;font-weight:600}
.ask{background:var(--ask);color:var(--askfg);padding:0 4px;border-radius:3px;font-weight:600}
.chip{background:var(--chip);border:1px solid var(--line);padding:0 6px;border-radius:10px;font-size:12px}
.printed{font-family:ui-monospace,monospace}
.null{color:var(--muted);font-style:italic}
.warn{color:var(--warn)} .notes{color:var(--muted)}
.status{font-size:12px;padding:1px 6px;border-radius:10px;border:1px solid var(--line)}
.status.verified{color:var(--ok)} .status.draft{color:var(--warn)}
nav a{margin-right:8px}
"""


def main() -> int:
    cases = load_cases()
    rows = [r for c in cases for r in csv_rows(c)]
    with (ROOT / "review.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    counts = {f: sum(1 for c in cases if c["feature"] == f) for f in FEATURES}
    nav = " ".join(
        f'<a href="#{html.escape(c["id"])}">{html.escape(c["id"])}</a>' for c in cases
    )
    page = (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Eval answer review</title>'
        f"<style>{STYLE}</style></head><body><h1>Eval answer keys: review</h1>"
        f'<p class="summary">{len(cases)} cases · '
        + " · ".join(f"{k} {v}" for k, v in counts.items())
        + '. Format 2: every price is <span class="printed">as printed</span> → amount currency. '
        '<span class="flag">unreadable</span> = cannot be read (not scored); '
        '<span class="ask">ask</span> = the app must ask the chef instead of guessing. '
        "“should ask” lists the clarifying questions the app is expected to raise; "
        "“arithmetic flags” the lines that do not add up (flagged, never corrected). "
        "Correct review.csv, then run <code>python ai-evals/apply_review.py</code>.</p>"
        f"<nav>{nav}</nav>" + "".join(case_html(c) for c in cases) + "</body></html>"
    )
    (ROOT / "review.html").write_text(page, encoding="utf-8")
    print(f"review.html and review.csv: {len(cases)} cases, {len(rows)} rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
