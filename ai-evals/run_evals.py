#!/usr/bin/env python3
"""Run the Food Bundles Chef AI evals against the backend AI gateway.

Reports per feature: schema-valid rate, field accuracy, ingredient match rate,
tool-call correctness, STT word error rate per language, p50/p95 latency and
(optionally) cost per call, then checks the release bar.

Usage (from the repo root, with the backend virtualenv that has httpx):
    EVAL_API_BASE_URL=http://localhost:8000/api/v1 EVAL_ACCESS_TOKEN=... \
    python ai-evals/run_evals.py --seed --suites menu,dish,documents,chat,voice

Never commit tokens. The token is read from the environment and never printed.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import uuid
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from evallib.metrics import match_items, names_match, params_match, percentile, rate, word_error_rate  # noqa: E402
from evallib.seed import seed_kitchen, snapshot  # noqa: E402

SUITES = ("menu", "dish", "documents", "chat", "voice")
MAX_UPLOAD_BYTES = 1_048_576
MIME = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".m4a": "audio/mp4", ".wav": "audio/wav"}

# Release bar (change only with product-owner approval).
RELEASE_BAR = {
    "schema_valid_min": 0.99,
    "menu_price_accuracy_clear_min": 0.90,
    "unconfirmed_writes_max": 0,
    "extraction_p95_ms_max": 15_000,
}


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def summarise_calls(calls: list[dict[str, Any]]) -> dict[str, Any]:
    latencies = [c["latency_ms"] for c in calls if c.get("status") == 200]
    valid = sum(1 for c in calls if c.get("status") == 200)
    answered = sum(1 for c in calls if c.get("status") is not None and c["status"] != 0)
    return {
        "calls": len(calls),
        "schema_valid": valid,
        # 200 = server validated the model output (with at most one repair); 422 AI_BAD_OUTPUT = schema failure.
        "schema_valid_rate": rate(valid, answered),
        "latency_p50_ms": percentile(latencies, 50),
        "latency_p95_ms": percentile(latencies, 95),
    }


class Runner:
    def __init__(self, client: httpx.Client, kitchen_id: str, run_id: str) -> None:
        self.client = client
        self.kitchen_id = kitchen_id
        self.run_id = run_id

    def _rid(self, item_id: str, suffix: str = "") -> str:
        return f"eval-{self.run_id}-{item_id}{suffix}"[:64]

    def _upload(self, path: str, file: Path, field: str, data: dict[str, str], rid: str) -> tuple[httpx.Response | None, float, str | None]:
        if not file.exists():
            return None, 0.0, f"missing file {file.name}"
        payload = file.read_bytes()
        if field == "image" and len(payload) > MAX_UPLOAD_BYTES:
            return None, 0.0, "image over 1 MiB — resize it like the app does (≤1600 px JPEG)"
        mime = MIME.get(file.suffix.lower(), "application/octet-stream")
        started = time.monotonic()
        try:
            response = self.client.post(
                f"/kitchens/{self.kitchen_id}/ai/{path}",
                files={field: (file.name, payload, mime)},
                data=data,
                headers={"X-Request-ID": rid},
            )
        except httpx.HTTPError as exc:
            return None, (time.monotonic() - started) * 1000, f"transport error: {type(exc).__name__}"
        return response, (time.monotonic() - started) * 1000, None

    # ── Classification (every image sample) ──
    def classify(self, entries: list[tuple[str, dict[str, Any]]]) -> dict[str, Any]:
        calls, hits = [], 0
        for suite, e in entries:
            rid = self._rid(e["id"], "-c")
            r, ms, err = self._upload("classify-image", ROOT / "datasets" / suite / e["file"], "image", {"language": e["language"]}, rid)
            calls.append({"id": e["id"], "request_id": rid, "status": r.status_code if r else 0, "latency_ms": ms, "error": err})
            if r is not None and r.status_code == 200 and r.json()["kind"] == e["expected"].get("kind"):
                hits += 1
        out = summarise_calls(calls)
        out.update({"kind_accuracy": rate(hits, len(entries)), "details": calls})
        return out

    # ── Menu extraction ──
    def menu(self, entries: list[dict[str, Any]]) -> dict[str, Any]:
        calls: list[dict[str, Any]] = []
        found = expected_total = returned_total = 0
        price_hits = price_total = clear_hits = clear_total = cat_hits = cat_total = 0
        for e in entries:
            rid = self._rid(e["id"])
            r, ms, err = self._upload("menu-extract", ROOT / "datasets" / "menu" / e["file"], "image", {"language": e["language"]}, rid)
            call = {"id": e["id"], "request_id": rid, "status": r.status_code if r else 0, "latency_ms": ms, "error": err}
            calls.append(call)
            if r is None or r.status_code != 200:
                continue
            body = r.json()
            call["prompt_version"] = body.get("prompt_version")
            expected = e["expected"]["items"]
            got = body["items"]
            pairs = match_items([i["name"] for i in expected], [g["name"] for g in got])
            found += len(pairs)
            expected_total += len(expected)
            returned_total += len(got)
            clear = "clear" in e.get("tags", [])
            for item in expected:
                if item["name"] not in pairs:
                    continue
                g = next(x for x in got if x["name"] == pairs[item["name"]])
                if "price" in item:
                    ok = g.get("price") == item["price"]
                    price_total += 1
                    price_hits += ok
                    if clear:
                        clear_total += 1
                        clear_hits += ok
                if item.get("category"):
                    cat_total += 1
                    cat_hits += g.get("category") == item["category"]
        out = summarise_calls(calls)
        out.update(
            {
                "item_recall": rate(found, expected_total),
                "item_precision": rate(found, returned_total),
                "price_accuracy": rate(price_hits, price_total),
                "price_accuracy_clear": rate(clear_hits, clear_total),
                "category_accuracy": rate(cat_hits, cat_total),
                "details": calls,
            }
        )
        return out

    # ── Dish analysis ──
    def dish(self, entries: list[dict[str, Any]], seeded_ingredients: dict[str, str]) -> dict[str, Any]:
        calls: list[dict[str, Any]] = []
        name_hits = cat_hits = cat_total = ing_hits = ing_total = linked = linkable = 0
        for e in entries:
            rid = self._rid(e["id"])
            r, ms, err = self._upload("dish-analyze", ROOT / "datasets" / "dish" / e["file"], "image", {"language": e["language"]}, rid)
            call = {"id": e["id"], "request_id": rid, "status": r.status_code if r else 0, "latency_ms": ms, "error": err}
            calls.append(call)
            if r is None or r.status_code != 200:
                continue
            body = r.json()
            call["prompt_version"] = body.get("prompt_version")
            exp = e["expected"]
            if exp.get("dish_name") and body.get("dish_name") and names_match(exp["dish_name"], body["dish_name"]):
                name_hits += 1
            if exp.get("category"):
                cat_total += 1
                cat_hits += body.get("category") == exp["category"]
            got_names = [i["name"] for i in body["ingredients"]]
            ing_hits += len(match_items(exp["ingredients"], got_names))
            ing_total += len(exp["ingredients"])
            for ing in body["ingredients"]:
                if any(names_match(seed, ing["name"]) for seed in seeded_ingredients):
                    linkable += 1
                    linked += ing.get("ingredient_id") is not None
        out = summarise_calls(calls)
        out.update(
            {
                "dish_name_accuracy": rate(name_hits, sum(1 for e in entries if e["expected"].get("dish_name"))),
                "category_accuracy": rate(cat_hits, cat_total),
                "ingredient_match_rate": rate(ing_hits, ing_total),
                "stock_link_rate": rate(linked, linkable),
                "details": calls,
            }
        )
        return out

    # ── Delivery notes / receipts ──
    def documents(self, entries: list[dict[str, Any]]) -> dict[str, Any]:
        calls: list[dict[str, Any]] = []
        found = expected_total = qty_hits = qty_total = price_hits = price_total = 0
        for e in entries:
            rid = self._rid(e["id"])
            r, ms, err = self._upload("document-extract", ROOT / "datasets" / "documents" / e["file"], "image", {"language": e["language"]}, rid)
            call = {"id": e["id"], "request_id": rid, "status": r.status_code if r else 0, "latency_ms": ms, "error": err}
            calls.append(call)
            if r is None or r.status_code != 200:
                continue
            body = r.json()
            call["prompt_version"] = body.get("prompt_version")
            expected = e["expected"]["lines"]
            pairs = match_items([x["name"] for x in expected], [g["name"] for g in body["lines"]])
            found += len(pairs)
            expected_total += len(expected)
            for line in expected:
                if line["name"] not in pairs:
                    continue
                g = next(x for x in body["lines"] if x["name"] == pairs[line["name"]])
                if line.get("quantity") is not None:
                    qty_total += 1
                    qty_hits += _same_decimal(line["quantity"], g.get("quantity"))
                if line.get("unit_price") is not None:
                    price_total += 1
                    price_hits += g.get("unit_price") == line["unit_price"]
        out = summarise_calls(calls)
        out.update(
            {
                "line_recall": rate(found, expected_total),
                "quantity_accuracy": rate(qty_hits, qty_total),
                "unit_price_accuracy": rate(price_hits, price_total),
                "details": calls,
            }
        )
        return out

    # ── Voice (speech-to-text) ──
    def voice(self, enabled_languages: list[str]) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for lang in ("en", "fr", "rw"):
            entries = load_jsonl(ROOT / "datasets" / "voice" / lang / "manifest.jsonl")
            if not entries:
                out[lang] = {"skipped": f"no samples in datasets/voice/{lang}/manifest.jsonl"}
                continue
            if lang not in enabled_languages:
                # Never send audio in a language the provider is not enabled for.
                out[lang] = {"skipped": f"transcription not enabled for '{lang}' on this server (audio not sent)"}
                continue
            calls, wers = [], []
            for e in entries:
                rid = self._rid(e["id"])
                r, ms, err = self._upload("transcribe", ROOT / "datasets" / "voice" / lang / e["file"], "audio", {"language": lang}, rid)
                calls.append({"id": e["id"], "request_id": rid, "status": r.status_code if r else 0, "latency_ms": ms, "error": err})
                if r is not None and r.status_code == 200:
                    wers.append(word_error_rate(e["expected"]["transcript"], r.json().get("text", "")))
            summary = summarise_calls(calls)
            summary.update({"wer_mean": (sum(wers) / len(wers)) if wers else None, "details": calls})
            out[lang] = summary
        return out

    # ── Assistant (tool-call correctness, 0 unconfirmed writes) ──
    def chat(self, tasks: list[dict[str, Any]]) -> dict[str, Any]:
        before = snapshot(self.client, self.kitchen_id)
        calls: list[dict[str, Any]] = []
        correct = 0
        for task in tasks:
            rid = self._rid(task["id"])
            started = time.monotonic()
            try:
                r = self.client.post(
                    f"/kitchens/{self.kitchen_id}/ai/agent",
                    json={"messages": [{"role": "chef", "content": t} for t in task["turns"]], "language": task["language"]},
                    headers={"X-Request-ID": rid},
                )
                status = r.status_code
            except httpx.HTTPError as exc:
                r, status = None, 0
                calls.append({"id": task["id"], "request_id": rid, "status": 0, "latency_ms": 0, "error": type(exc).__name__})
                continue
            ms = (time.monotonic() - started) * 1000
            call: dict[str, Any] = {"id": task["id"], "language": task["language"], "request_id": rid, "status": status, "latency_ms": ms}
            if status == 200 and r is not None:
                ok, why = _check_turn(task["expect"], r.json())
                call.update({"correct": ok, "problem": why})
                correct += ok
            calls.append(call)
        after = snapshot(self.client, self.kitchen_id)
        changed = [k for k in before["stock"] if before["stock"][k] != after["stock"].get(k)]
        unconfirmed = len(changed) + (0 if before["portions_today"] == after["portions_today"] else 1)
        out = summarise_calls(calls)
        by_lang = {
            lang: rate(sum(1 for c in calls if c.get("language") == lang and c.get("correct")), sum(1 for t in tasks if t["language"] == lang))
            for lang in ("en", "fr", "rw")
        }
        out.update({"tool_call_correctness": rate(correct, len(tasks)), "correctness_by_language": by_lang, "unconfirmed_writes": unconfirmed, "details": calls})
        return out


def _same_decimal(a: Any, b: Any) -> bool:
    try:
        return Decimal(str(a)) == Decimal(str(b))
    except (InvalidOperation, TypeError):
        return False


def _check_turn(expect: dict[str, Any], body: dict[str, Any]) -> tuple[bool, str | None]:
    kind = "proposal" if body.get("proposal") else "clarification" if body.get("clarification") else "answer"
    if kind != expect["type"]:
        return False, f"expected {expect['type']}, got {kind}"
    if kind == "proposal":
        proposal = body["proposal"]
        if proposal["action_type"] != expect["action_type"]:
            return False, f"action {proposal['action_type']}"
        bad = params_match(expect.get("params", {}), proposal.get("params", {}))
        if bad:
            return False, f"params {', '.join(bad)}"
    if kind == "answer" and expect.get("mentions_any"):
        text = body.get("reply_text", "")
        if not any(m in text for m in expect["mentions_any"]):
            return False, "answer missing expected figure"
    return True, None


def join_costs(results: dict[str, Any], server_log: Path, price_config: Path | None) -> dict[str, Any]:
    """Sum tokens per request_id from `ai_call` log lines; price them when a price config is given."""
    usage: dict[str, dict[str, Any]] = {}
    for line in server_log.read_text(encoding="utf-8").splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("event") == "ai_call" and str(event.get("request_id", "")).startswith("eval-"):
            usage[event["request_id"]] = event
    prices = json.loads(price_config.read_text(encoding="utf-8")).get("models", {}) if price_config else {}
    summary: dict[str, Any] = {}
    for feature, data in results.items():
        details = data.get("details") if isinstance(data, dict) else None
        if not details:
            continue
        costs, tokens = [], []
        for call in details:
            ev = usage.get(call.get("request_id", ""))
            if not ev:
                continue
            tokens.append(ev.get("total_tokens") or 0)
            price = prices.get(ev.get("model", ""), {})
            pin, pout = price.get("input_per_million"), price.get("output_per_million")
            if pin is not None and pout is not None:
                costs.append((ev.get("prompt_tokens", 0) * pin + ev.get("completion_tokens", 0) * pout) / 1_000_000)
        summary[feature] = {
            "calls_with_usage": len(tokens),
            "tokens_per_call": (sum(tokens) / len(tokens)) if tokens else None,
            "cost_per_call": (sum(costs) / len(costs)) if costs else None,
        }
    return summary


def release_bar(results: dict[str, Any]) -> list[tuple[str, bool | None, str]]:
    checks: list[tuple[str, bool | None, str]] = []
    rates = [v.get("schema_valid_rate") for v in results.values() if isinstance(v, dict) and v.get("schema_valid_rate") is not None]
    worst = min(rates) if rates else None
    checks.append(("Schema-valid ≥ 99% (every feature)", None if worst is None else worst >= RELEASE_BAR["schema_valid_min"], _fmt(worst)))
    menu_clear = results.get("menu", {}).get("price_accuracy_clear")
    checks.append(("Menu price accuracy ≥ 90% on clear photos", None if menu_clear is None else menu_clear >= RELEASE_BAR["menu_price_accuracy_clear_min"], _fmt(menu_clear)))
    writes = results.get("chat", {}).get("unconfirmed_writes")
    checks.append(("0 unconfirmed writes", None if writes is None else writes <= RELEASE_BAR["unconfirmed_writes_max"], str(writes)))
    p95s = [results.get(s, {}).get("latency_p95_ms") for s in ("menu", "dish", "documents")]
    p95s = [p for p in p95s if p is not None]
    worst_p95 = max(p95s) if p95s else None
    checks.append(("p95 extraction latency ≤ 15 s", None if worst_p95 is None else worst_p95 <= RELEASE_BAR["extraction_p95_ms_max"], _ms(worst_p95)))
    return checks


def _fmt(v: float | None) -> str:
    return "n/a" if v is None else f"{v * 100:.1f}%"


def _ms(v: float | None) -> str:
    return "n/a" if v is None else f"{v / 1000:.1f} s"


def markdown(results: dict[str, Any], costs: dict[str, Any], checks: list[tuple[str, bool | None, str]], meta: dict[str, Any]) -> str:
    lines = [
        f"# AI eval results — {meta['started']}",
        "",
        f"Server: `{meta['base_url']}` · kitchen `{meta['kitchen_id']}` · run `{meta['run_id']}`",
        "",
        "| Feature | Calls | Schema-valid | Quality | p50 / p95 latency | Cost / call |",
        "|---|---|---|---|---|---|",
    ]
    quality_keys = {
        "classify": [("kind accuracy", "kind_accuracy")],
        "menu": [("item recall", "item_recall"), ("price", "price_accuracy"), ("price (clear)", "price_accuracy_clear"), ("category", "category_accuracy")],
        "dish": [("ingredient match", "ingredient_match_rate"), ("stock link", "stock_link_rate"), ("name", "dish_name_accuracy")],
        "documents": [("line recall", "line_recall"), ("quantity", "quantity_accuracy"), ("unit price", "unit_price_accuracy")],
        "chat": [("tool-call correctness", "tool_call_correctness"), ("unconfirmed writes", "unconfirmed_writes")],
    }
    for feature, data in results.items():
        if feature == "voice":
            for lang, v in data.items():
                if v.get("skipped"):
                    lines.append(f"| voice ({lang}) | — | — | {v['skipped']} | — | — |")
                else:
                    wer = "n/a" if v.get("wer_mean") is None else f"WER {v['wer_mean'] * 100:.1f}%"
                    lines.append(f"| voice ({lang}) | {v['calls']} | {_fmt(v['schema_valid_rate'])} | {wer} | {_ms(v['latency_p50_ms'])} / {_ms(v['latency_p95_ms'])} | — |")
            continue
        if data.get("skipped"):
            lines.append(f"| {feature} | — | — | {data['skipped']} | — | — |")
            continue
        quality = ", ".join(
            f"{label} {data[key] if key == 'unconfirmed_writes' else _fmt(data.get(key))}" for label, key in quality_keys.get(feature, [])
        )
        cost = costs.get(feature, {}).get("cost_per_call")
        lines.append(
            f"| {feature} | {data['calls']} | {_fmt(data['schema_valid_rate'])} | {quality} | "
            f"{_ms(data['latency_p50_ms'])} / {_ms(data['latency_p95_ms'])} | {'n/a' if cost is None else f'{cost:.5f}'} |"
        )
    lines += ["", "## Release bar", "", "| Check | Result | Value |", "|---|---|---|"]
    for name, passed, value in checks:
        lines.append(f"| {name} | {'—' if passed is None else ('PASS' if passed else 'FAIL')} | {value} |")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default=os.environ.get("EVAL_API_BASE_URL", ""))
    parser.add_argument("--kitchen-id", default=os.environ.get("EVAL_KITCHEN_ID", ""))
    parser.add_argument("--seed", action="store_true", help="create a fresh eval kitchen from fixtures/eval-kitchen.json")
    parser.add_argument("--suites", default=",".join(SUITES))
    parser.add_argument("--no-classify", action="store_true", help="skip the classification pass over image samples")
    parser.add_argument("--server-log", type=Path, help="backend JSON log covering the run (for tokens/cost)")
    parser.add_argument("--price-config", type=Path, help="per-model prices (see price-config.example.json)")
    parser.add_argument("--out", type=Path, default=ROOT / "results")
    args = parser.parse_args()

    token = os.environ.get("EVAL_ACCESS_TOKEN", "")
    if not args.base_url or not token:
        print("Set EVAL_API_BASE_URL and EVAL_ACCESS_TOKEN (never commit the token).", file=sys.stderr)
        return 2
    suites = [s.strip() for s in args.suites.split(",") if s.strip() in SUITES]
    run_id = uuid.uuid4().hex[:8]
    started = datetime.now(UTC).strftime("%Y-%m-%dT%H-%M-%SZ")

    with httpx.Client(base_url=args.base_url, headers={"Authorization": f"Bearer {token}"}, timeout=90) as client:
        seeded: dict[str, Any] = {"ingredients": {}, "menu_items": {}}
        if args.seed:
            seeded = seed_kitchen(client, run_id, ROOT / "fixtures" / "eval-kitchen.json")
            kitchen_id = seeded["kitchen_id"]
        elif args.kitchen_id:
            kitchen_id = args.kitchen_id
        else:
            print("Pass --seed (recommended) or --kitchen-id.", file=sys.stderr)
            return 2
        features = client.get(f"/kitchens/{kitchen_id}/ai/features").json()
        runner = Runner(client, kitchen_id, run_id)
        results: dict[str, Any] = {}

        manifests = {s: load_jsonl(ROOT / "datasets" / s / "manifest.jsonl") for s in ("menu", "dish", "documents")}
        if not args.no_classify and features.get("image_classify"):
            images = [(s, e) for s in ("menu", "dish", "documents") if s in suites for e in manifests[s]]
            results["classify"] = runner.classify(images) if images else {"skipped": "no image samples"}
        gates = {"menu": "menu_scan", "dish": "dish_analysis", "documents": "document_scan", "chat": "assistant"}
        for suite in suites:
            if suite in gates and not features.get(gates[suite]):
                results[suite] = {"skipped": f"'{gates[suite]}' is switched off on this server"}
            elif suite == "voice":
                results[suite] = runner.voice(features.get("transcription_languages", []))
            elif suite == "chat":
                tasks = load_jsonl(ROOT / "datasets" / "chat" / "tasks.jsonl")
                if not args.seed:
                    results[suite] = {"skipped": "chat tasks are written against the seeded kitchen — run with --seed"}
                else:
                    results[suite] = runner.chat(tasks)
            elif not manifests[suite]:
                results[suite] = {"skipped": f"no samples in datasets/{suite}/manifest.jsonl"}
            elif suite == "menu":
                results[suite] = runner.menu(manifests[suite])
            elif suite == "dish":
                results[suite] = runner.dish(manifests[suite], seeded["ingredients"])
            elif suite == "documents":
                results[suite] = runner.documents(manifests[suite])

    costs = join_costs(results, args.server_log, args.price_config) if args.server_log else {}
    checks = release_bar(results)
    meta = {"started": started, "base_url": args.base_url, "kitchen_id": kitchen_id, "run_id": run_id, "features": features}
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / f"{started}.json").write_text(json.dumps({"meta": meta, "results": results, "costs": costs}, indent=2), encoding="utf-8")
    report = markdown(results, costs, checks, meta)
    (args.out / f"{started}.md").write_text(report, encoding="utf-8")
    print(report)
    return 0 if all(passed is not False for _, passed, _ in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
