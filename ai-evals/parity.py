"""Phase 8 eval parity: Meta vs Claude (effort low / medium) on the same cases.

    python ai-evals/parity.py plan                  # case list, grading, cost estimate: NO calls
    python ai-evals/parity.py run --dry-run             # fake providers: plumbing check, no cost
    python ai-evals/parity.py run --runs 3 --budget-usd 25
    python ai-evals/parity.py report ai-evals/results/parity-<id>

Every arm runs in its own process with that arm's settings and **no fallback**
(AI_FALLBACK_PROVIDER=none), so a Claude failure is scored as a Claude failure, never as a
Meta answer. Workers drive the real FastAPI app in-process (same endpoints, router, prompts
and validation as production) against a throw-away SQLite database in the run folder: no
dev or production data is touched. A shared spend ledger stops all calls before the budget
would be exceeded. Rules: ai-evals/PARITY.md.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
import time
from collections import defaultdict
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT.parent / "backend"
CASES = ROOT / "cases"
FIXTURE = ROOT / "fixtures" / "eval-kitchen.json"
# Step 2a: a second kitchen in EUR (Paris) for currency, separator and unit cases.
FIXTURE_EUR = ROOT / "fixtures" / "eval-kitchen-eur.json"
FIXTURES = {"rwf": FIXTURE, "eur": FIXTURE_EUR}
IMAGE_FEATURES = ("menu", "dish", "document", "junk")
FEATURES = ("classify", "menu", "dish", "document", "assistant")

# Arm → environment. Classify effort is fixed at low (approved), so classify runs on
# meta and claude-low only.
ARMS: dict[str, dict[str, str]] = {
    "meta": {"AI_PRIMARY_PROVIDER": "meta", "AI_FALLBACK_PROVIDER": "none"},
    "claude-low": {
        "AI_PRIMARY_PROVIDER": "anthropic",
        "AI_FALLBACK_PROVIDER": "none",
        "ANTHROPIC_ENABLED": "true",
        "ANTHROPIC_EFFORT_CLASSIFY": "low",
        "ANTHROPIC_EFFORT_EXTRACT": "low",
        "ANTHROPIC_EFFORT_CHAT": "low",
    },
    "claude-medium": {
        "AI_PRIMARY_PROVIDER": "anthropic",
        "AI_FALLBACK_PROVIDER": "none",
        "ANTHROPIC_ENABLED": "true",
        "ANTHROPIC_EFFORT_CLASSIFY": "low",
        "ANTHROPIC_EFFORT_EXTRACT": "medium",
        "ANTHROPIC_EFFORT_CHAT": "medium",
    },
}
ARM_FEATURES = {"meta": FEATURES, "claude-low": FEATURES, "claude-medium": FEATURES[1:]}

# Tokens per call (input, output), about 1.5x the largest value measured in the 2026-11-18
# smoke tests (Meta writes far more output than Claude), billed as if nothing were cached.
# Used for the up-front estimate and as the headroom of the hard budget stop.
EST_TOKENS = {
    "classify": (2_400, 1_000),
    "menu": (2_900, 1_800),
    "dish": (2_200, 2_200),
    "document": (2_900, 1_800),
    "assistant": (4_000, 1_300),
}
COMMON_ENV = {
    "AI_ENABLED": "true",
    "AI_AGENT_ENABLED": "true",
    "AI_IMAGE_CLASSIFY_ENABLED": "true",
    "AI_MENU_SCAN_ENABLED": "true",
    "AI_DISH_ANALYSIS_ENABLED": "true",
    "AI_DOCUMENT_SCAN_ENABLED": "true",
    "AI_MAX_REQUESTS_PER_KITCHEN_PER_DAY": "0",
    "AI_MAX_REQUESTS_PER_CHEF_PER_DAY": "0",
    "AI_DAILY_BUDGET_USD": "0",
    "AI_KITCHEN_DAILY_BUDGET_USD": "0",
    "AI_ROUTER_MAX_RETRIES": "1",
    "APP_ENV": "development",
}


# ── Cases ─────────────────────────────────────────────────────────────────────


STATUS_COUNTS: dict[str, int] = defaultdict(int)


def load_image_cases(include_drafts: bool = False) -> dict[str, list[dict[str, Any]]]:
    """cases/<feature>/<id>/{image.jpg, expected.json} → {feature: [case, ...]} (validated).

    Only answer keys with "status": "verified" are used (a missing status counts as draft);
    `include_drafts` adds "draft" ones for planning and dry runs. "excluded" is never used.
    STATUS_COUNTS records how many cases of each status were found.
    """
    STATUS_COUNTS.clear()
    wanted = {"verified", "draft"} if include_drafts else {"verified"}
    out: dict[str, list[dict[str, Any]]] = {f: [] for f in IMAGE_FEATURES}
    for feature in IMAGE_FEATURES:
        folder = CASES / feature
        if not folder.is_dir():
            continue
        for case_dir in sorted(p for p in folder.iterdir() if p.is_dir()):
            image = next(
                (
                    case_dir / n
                    for n in ("image.jpg", "image.jpeg", "image.png")
                    if (case_dir / n).exists()
                ),
                None,
            )
            expected_file = case_dir / "expected.json"
            if image is None or not expected_file.exists():
                raise SystemExit(f"{case_dir}: needs image.jpg and expected.json")
            expected = json.loads(expected_file.read_text(encoding="utf-8"))
            problem = validate_expected(feature, expected)
            if problem:
                raise SystemExit(f"{expected_file}: {problem}")
            status = expected.get("status", "draft")
            STATUS_COUNTS[status] += 1
            if status not in wanted:
                continue
            out[feature].append(
                {
                    "id": f"{feature}/{case_dir.name}",
                    "image": image,
                    "expected": expected,
                }
            )
    return out


def validate_expected(feature: str, e: dict[str, Any]) -> str | None:
    if "kind" not in e:
        return "missing 'kind'"
    if e.get("status", "draft") not in ("draft", "verified", "excluded"):
        return "status must be draft, verified or excluded"
    if "non_rwf" in json.dumps(e):
        return "'non_rwf' is retired: write the price as {text, amount, currency} (format 2)"
    if e.get("kitchen", "rwf") not in FIXTURES:
        return f"kitchen must be one of {sorted(FIXTURES)}"
    if feature == "menu" and not isinstance(e.get("items"), list):
        return "menu cases need 'items': [{name, price, category}]"
    if feature == "dish" and not isinstance(e.get("ingredients"), list):
        return "dish cases need 'ingredients': [name, ...]"
    if feature == "document" and not isinstance(e.get("lines"), list):
        return "document cases need 'lines': [{name, quantity, unit, unit_price, line_total}]"
    return None


def load_assistant_cases() -> list[dict[str, Any]]:
    path = CASES / "assistant" / "cases.jsonl"
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def kitchen_numbers(fixture: Path = FIXTURE) -> set[Decimal]:
    """Every number the eval kitchen's data can justify: stock, costs, prices, recipe
    quantities and each dish's food cost (sum of qty x unit cost)."""
    data = json.loads(fixture.read_text(encoding="utf-8"))
    nums: set[Decimal] = set()
    cost = {}
    for ing in data["ingredients"]:
        nums |= {Decimal(ing["stock"]), Decimal(ing["cost_per_unit"])}
        cost[ing["name"]] = Decimal(ing["cost_per_unit"])
    for item in data["menu"]:
        nums.add(Decimal(item["selling_price"]))
        food = Decimal(0)
        for line in item["recipe"]:
            q = Decimal(line["qty_per_portion"])
            nums.add(q)
            food += q * cost[line["ingredient"]]
        nums.add(food)
        if food:
            nums.add(
                (food / Decimal(item["selling_price"]) * 100).quantize(Decimal(1))
            )  # food cost %
    return {n.normalize() for n in nums}


# ── Cost estimate ─────────────────────────────────────────────────────────────


def _backend_imports() -> None:
    """Make `app` importable; settings read backend/.env, so import them from backend/."""
    if str(BACKEND) not in sys.path:
        sys.path.insert(0, str(BACKEND))
    if "app.core.config" not in sys.modules:
        cwd = Path.cwd()
        os.chdir(BACKEND)
        try:
            import app.core.config  # noqa: F401
        finally:
            os.chdir(cwd)


def estimate_call(feature: str, arm: str) -> float:
    _backend_imports()
    from app.core.config import settings
    from app.modules.ai.providers import catalog
    from app.modules.ai.providers.base import Usage

    tokens_in, tokens_out = EST_TOKENS["classify" if feature == "junk" else feature]
    if arm.endswith("medium"):
        tokens_out = int(tokens_out * 1.5)
    if arm == "meta":
        model = settings.META_MUSE_SPARK_MODEL or "muse-spark-1.3"
    else:
        model = (
            settings.ANTHROPIC_MODEL_FAST
            if feature == "classify"
            else settings.ANTHROPIC_MODEL_STANDARD
        )
    return catalog.cost_usd(
        model, Usage(input_tokens=tokens_in, output_tokens=tokens_out)
    )


def call_counts(images: dict[str, list], assistant: list[dict]) -> dict[str, int]:
    """Model calls per run, per feature (classify runs over every image case)."""
    return {
        "classify": sum(len(v) for v in images.values()),
        "menu": len(images["menu"]),
        "dish": len(images["dish"]),
        "document": len(images["document"]),
        "assistant": sum(len(c["turns"]) for c in assistant),
    }


# ── Plan ──────────────────────────────────────────────────────────────────────


def cmd_plan(args: argparse.Namespace) -> int:
    images = load_image_cases(include_drafts=args.include_drafts)
    assistant = load_assistant_cases()
    counts = call_counts(images, assistant)
    if args.assume_images:
        n_menu, n_dish, n_doc, n_junk = (int(x) for x in args.assume_images.split(","))
        counts.update(
            classify=n_menu + n_dish + n_doc + n_junk,
            menu=n_menu,
            dish=n_dish,
            document=n_doc,
        )
    print("# Phase 8 parity plan\n")
    found = ", ".join(f"{k} {v}" for k, v in sorted(STATUS_COUNTS.items())) or "none"
    used = "verified + draft" if args.include_drafts else "verified only"
    print(f"## Image cases (cases/<feature>/<id>/): found {found}; using {used}\n")
    for feature in IMAGE_FEATURES:
        rows = images[feature]
        print(f"- {feature}: {len(rows)} case(s)")
        for c in rows:
            e = c["expected"]
            counted = {"menu": "items", "dish": "ingredients", "document": "lines"}.get(
                feature
            )
            detail = f"{len(e[counted])} {counted}" if counted else f"kind={e['kind']}"
            print(
                f"  - {c['id']}: kind={e['kind']}, {detail}, "
                f"tags={e.get('tags', [])}, lang={e.get('language', '-')}"
            )
    print(f"\n## Assistant cases (cases/assistant/cases.jsonl): {len(assistant)}\n")
    print("| id | lang | turns | expected |")
    print("|---|---|---|---|")
    for c in assistant:
        exp = c["expect"]
        what = exp["type"] + (
            f" {exp['action_type']}" if exp.get("action_type") else ""
        )
        extras = [
            k
            for k in ("params", "mentions_any", "no_data", "out_of_domain")
            if exp.get(k)
        ]
        if exp.get("params"):
            what += " " + json.dumps(exp["params"], ensure_ascii=False)
        elif extras:
            what += " (" + ", ".join(extras) + ")"
        turns = " → ".join(c["turns"])
        print(
            f"| {c['id']} | {c['language']}{' *' if c.get('needs_native_review') else ''} "
            f"| {turns} | {what} |"
        )
    print("\n`*` Kinyarwanda drafts, flagged for native review.\n")
    assumed = (
        f", assuming {args.assume_images} menu,dish,document,junk images"
        if args.assume_images
        else ""
    )
    print(f"## Calls and cost estimate ({args.runs} runs per case{assumed})\n")
    total = 0.0
    print("| arm | feature | calls | est. USD |")
    print("|---|---|---|---|")
    for arm, feats in ARM_FEATURES.items():
        for feature in feats:
            n = counts[feature] * args.runs
            usd = n * estimate_call(feature, arm)
            total += usd
            print(f"| {arm} | {feature} | {n} | {usd:.2f} |")
    print(
        f"\n**Estimated total: ${total:.2f}** "
        f"(pessimistic token counts; hard stop at ${args.budget_usd:.2f})."
    )
    return 0


# ── Run (parent) ──────────────────────────────────────────────────────────────


def cmd_run(args: argparse.Namespace) -> int:
    if args.include_drafts and not args.dry_run:
        raise SystemExit(
            "--include-drafts is for dry runs only: real runs grade verified answers only"
        )
    run_id = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ") + (
        "-dry" if args.dry_run else ""
    )
    run_dir = (args.out / f"parity-{run_id}").resolve()
    run_dir.mkdir(parents=True)
    (run_dir / "ledger.json").write_text(
        json.dumps({"spent_usd": 0.0, "by_arm": {}, "stopped": None})
    )
    meta = {
        "run_id": run_id,
        "runs": args.runs,
        "budget_usd": args.budget_usd,
        "arms": args.arms,
        "features": args.features,
        "dry_run": args.dry_run,
        "started": datetime.now(UTC).isoformat(),
    }
    (run_dir / "run.json").write_text(json.dumps(meta, indent=2))
    for arm in args.arms:
        env = {**os.environ, **COMMON_ENV, **ARMS[arm]}
        env["DATABASE_URL"] = (
            f"sqlite+aiosqlite:///{(run_dir / f'{arm}.db').as_posix()}"
        )
        env["PYTHONIOENCODING"] = "utf-8"
        # backend/.env holds the provider keys; a process-level variable would shadow it.
        if not args.keep_env_key:
            env.pop("ANTHROPIC_API_KEY", None)
        cmd = [
            sys.executable,
            str(Path(__file__).resolve()),
            "worker",
            "--arm",
            arm,
            "--run-dir",
            str(run_dir),
            "--runs",
            str(args.runs),
            "--budget-usd",
            str(args.budget_usd),
            "--features",
            ",".join(args.features),
        ]
        if args.dry_run:
            cmd.append("--dry-run")
        if args.include_drafts:
            cmd.append("--include-drafts")
        print(f"== arm {arm}", flush=True)
        code = subprocess.run(cmd, env=env, cwd=BACKEND).returncode  # noqa: S603 (own script)
        ledger = json.loads((run_dir / "ledger.json").read_text())
        arm_usd = ledger.get("by_arm", {}).get(arm, 0.0)
        print(
            f"   exit {code}; arm ${arm_usd:.4f}; total ${ledger['spent_usd']:.4f}",
            flush=True,
        )
        if ledger.get("stopped"):
            print(f"   BUDGET STOP: {ledger['stopped']}", flush=True)
            break
    return cmd_report(argparse.Namespace(run_dir=run_dir))


# ── Worker (one arm, in-process app) ──────────────────────────────────────────


class _Recorder:
    """Replaces the router's logger: keeps every ai_call event (provider, tokens, cost)."""

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    def _rec(self, event: str, **kw: Any) -> None:
        if event == "ai_call":
            self.calls.append(kw)

    def info(self, event: str, **kw: Any) -> None:
        self._rec(event, **kw)

    error = warning = critical = info


def cmd_worker(args: argparse.Namespace) -> int:
    _backend_imports()
    sys.path.insert(0, str(ROOT))
    import asyncio

    import app.main
    from app.core.database import AsyncSessionFactory, Base, engine
    from app.core.security import create_access_token
    from app.modules.ai.gateway import core as gateway_core
    from app.modules.ai.providers import router as router_mod
    from app.modules.ai.schemas.agent import ACTION_PARAMS
    from app.modules.chefs.models import Chef
    from evallib import grading
    from evallib.seed import seed_kitchen, snapshot
    from fastapi.testclient import TestClient

    engine.echo = False
    import logging

    logging.disable(
        logging.INFO
    )  # keep the eval output readable (no SQL/HTTP debug lines)
    arm, run_dir = args.arm, Path(args.run_dir)
    features = [f for f in args.features if f in ARM_FEATURES[arm]]
    recorder = _Recorder()
    router_mod.logger = recorder

    # Count how the Assistant's JSON-encoded params string decodes (first answers included,
    # before any repair): the Phase 8 wire-format risk the release review asked to track.
    decode_stats: dict[str, int] = defaultdict(int)
    original_parse = gateway_core._parse

    def tracking_parse(raw: str, schema: type) -> Any:
        if schema.__name__ == "ModelAgentTurn":
            decode_stats["outputs"] += 1
            try:
                data = json.loads(gateway_core.extract_json(raw))
                params = data.get("params")
                if isinstance(params, str):
                    decode_stats["params_string"] += 1
                    try:
                        decoded = json.loads(params) if params.strip() else None
                        if decoded is not None and not isinstance(decoded, dict):
                            raise ValueError("not an object")
                    except ValueError:
                        decode_stats["params_decode_fail"] += 1
                    else:
                        model = ACTION_PARAMS.get(data.get("action_type") or "")
                        if decoded is not None and model is not None:
                            try:
                                model.model_validate(decoded)
                            except Exception:
                                decode_stats["params_validation_fail"] += 1
            except Exception:
                decode_stats["json_fail"] += 1
        return original_parse(raw, schema)

    gateway_core._parse = tracking_parse

    if args.dry_run:
        _install_fake_providers(router_mod.provider_router, arm)
    else:
        primary = router_mod.provider_router.providers().get("anthropic")
        if arm != "meta" and primary is not None:
            primary.warm_up()

    async def init_db() -> str:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with AsyncSessionFactory() as db:
            chef = Chef(phone_number="+250700000777", name="Parity Eval Chef")
            db.add(chef)
            await db.commit()
            return str(chef.id)

    chef_id = asyncio.run(init_db())
    client = TestClient(app.main.app, base_url="http://eval/api/v1")
    client.headers["Authorization"] = f"Bearer {create_access_token(chef_id)}"
    seeded_all = {name: seed_kitchen(client, f"{arm}-{name}", path) for name, path in FIXTURES.items()}
    kitchen_ids = {name: k["kitchen_id"] for name, k in seeded_all.items()}
    seeded = seeded_all["rwf"]
    kitchen_by_id = {v: k for k, v in seeded["ingredients"].items()}
    allowed_by_kitchen = {name: kitchen_numbers(path) for name, path in FIXTURES.items()}
    params_validator = _params_validator(ACTION_PARAMS)

    ledger_path = run_dir / "ledger.json"
    out = (run_dir / f"{arm}.jsonl").open("a", encoding="utf-8")

    def budget_ok(feature: str) -> bool:
        ledger = json.loads(ledger_path.read_text())
        if ledger.get("stopped"):
            return False
        need = 0.0 if args.dry_run else estimate_call(feature, arm)
        if ledger["spent_usd"] + need > args.budget_usd:
            ledger["stopped"] = (
                f"before {arm}/{feature}: spent ${ledger['spent_usd']:.4f} + next call "
                f"up to ${need:.4f} > ${args.budget_usd:.2f}"
            )
            ledger_path.write_text(json.dumps(ledger))
            return False
        return True

    def charge(calls: list[dict[str, Any]]) -> float:
        cost = sum(float(c.get("cost_usd") or 0) for c in calls)
        if not args.dry_run:
            ledger = json.loads(ledger_path.read_text())
            ledger["spent_usd"] += cost
            by_arm = ledger.setdefault("by_arm", {})
            by_arm[arm] = by_arm.get(arm, 0.0) + cost
            ledger_path.write_text(json.dumps(ledger))
        return cost

    def post(
        path: str, feature: str, kitchen: str = "rwf", **kw: Any
    ) -> tuple[int, dict | None, str | None, list[dict], float]:
        before = len(recorder.calls)
        started = time.monotonic()
        resp = client.post(f"/kitchens/{kitchen_ids[kitchen]}/ai/{path}", **kw)
        wall_ms = (time.monotonic() - started) * 1000
        calls = recorder.calls[before:]
        body, code = None, None
        try:
            parsed = resp.json()
            if resp.status_code == 200:
                body = parsed
            else:
                code = (
                    (parsed.get("error") or {}).get("code")
                    if isinstance(parsed, dict)
                    else None
                )
        except ValueError:
            pass
        charge(calls)
        return resp.status_code, body, code, calls, wall_ms

    def write(row: dict[str, Any]) -> None:
        out.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
        out.flush()

    def call_fields(calls: list[dict[str, Any]], wall_ms: float) -> dict[str, Any]:
        return {
            "latency_ms": sum(c.get("latency_ms") or 0 for c in calls)
            or round(wall_ms),
            "wall_ms": round(wall_ms),
            "provider": ",".join(
                sorted({c.get("provider_served") or "-" for c in calls})
            ),
            "model": ",".join(sorted({c.get("model") or "-" for c in calls})),
            "outcomes": [c.get("outcome") for c in calls],
            "input_tokens": sum(c.get("input_tokens") or 0 for c in calls),
            "output_tokens": sum(c.get("output_tokens") or 0 for c in calls),
            "cached_tokens": sum(c.get("cached_tokens") or 0 for c in calls),
            "cost_usd": sum(float(c.get("cost_usd") or 0) for c in calls),
        }

    images = load_image_cases(include_drafts=args.include_drafts)
    assistant = load_assistant_cases()
    stopped = False
    for run in range(1, args.runs + 1):
        for feature in features:
            if stopped:
                break
            if feature == "assistant":
                before = {k: snapshot(client, i) for k, i in kitchen_ids.items()}
                for case in assistant:
                    history: list[dict[str, str]] = []
                    status, body, code, calls_all, wall_total = 0, None, None, [], 0.0
                    for turn in case["turns"]:
                        if not budget_ok("assistant"):
                            stopped = True
                            break
                        history.append({"role": "chef", "content": turn})
                        status, body, code, calls, wall = post(
                            "agent",
                            "assistant",
                            case.get("kitchen", "rwf"),
                            json={"messages": history, "language": case["language"]},
                            headers={
                                "X-Request-ID": f"parity-{arm}-{case['id']}-{run}"
                            },
                        )
                        calls_all += calls
                        wall_total += wall
                        if body is None:
                            break
                        reply = " ".join(
                            filter(
                                None,
                                [
                                    body.get("reply_text"),
                                    (body.get("clarification") or {}).get("question"),
                                ],
                            )
                        )
                        history.append({"role": "agent", "content": reply})
                    if stopped:
                        break
                    allowed = allowed_by_kitchen[case.get("kitchen", "rwf")] | {
                        n for t in case["turns"] for n in grading.extract_numbers(t)
                    }
                    allowed |= {
                        Decimal(datetime.now(UTC).year),
                        Decimal(datetime.now(UTC).month),
                        Decimal(datetime.now(UTC).day),
                    }
                    grade = grading.grade_assistant(
                        case,
                        body,
                        http_status=status,
                        error_code=code,
                        allowed_numbers=allowed,
                        params_validator=params_validator,
                    )
                    write(
                        {
                            "arm": arm,
                            "feature": "assistant",
                            "case": case["id"],
                            "language": case["language"],
                            "run": run,
                            "http": status,
                            "error_code": code,
                            "grade": grade,
                            **call_fields(calls_all, wall_total),
                            "response": body,
                        }
                    )
                after = {k: snapshot(client, i) for k, i in kitchen_ids.items()}
                write(
                    {
                        "arm": arm,
                        "feature": "assistant",
                        "case": "_writes",
                        "run": run,
                        "unconfirmed_writes": before != after,
                        "before": before,
                        "after": after,
                    }
                )
                continue
            for case in _feature_cases(feature, images):
                if not budget_ok(feature):
                    stopped = True
                    break
                files = {
                    "image": (
                        case["image"].name,
                        case["image"].read_bytes(),
                        "image/jpeg",
                    )
                }
                lang = case["expected"].get("language", "en")
                path = {
                    "classify": "classify-image",
                    "menu": "menu-extract",
                    "dish": "dish-analyze",
                    "document": "document-extract",
                }[feature]
                status, body, code, calls, wall = post(
                    path,
                    feature,
                    case["expected"].get("kitchen", "rwf"),
                    files=files,
                    data={"language": lang},
                    headers={"X-Request-ID": f"parity-{arm}-{case['id']}-{run}"},
                )
                exp = case["expected"]
                if feature == "classify":
                    grade = grading.grade_classify(exp["kind"], body)
                elif feature == "menu":
                    grade = grading.grade_menu(
                        exp["items"], body, grading.expected_clarify(exp, exp["items"])
                    )
                elif feature == "dish":
                    grade = grading.grade_dish(exp["ingredients"], body, kitchen_by_id)
                else:
                    grade = grading.grade_document(exp["lines"], body, exp)
                write(
                    {
                        "arm": arm,
                        "feature": feature,
                        "case": case["id"],
                        "language": lang,
                        "run": run,
                        "tags": exp.get("tags", []),
                        "http": status,
                        "error_code": code,
                        "grade": grade,
                        **call_fields(calls, wall),
                        "response": body,
                    }
                )
    write(
        {
            "arm": arm,
            "feature": "assistant",
            "case": "_decode",
            "decode_stats": dict(decode_stats),
        }
    )
    out.close()
    return 0


def _feature_cases(feature: str, images: dict[str, list]) -> list[dict]:
    if feature == "classify":
        return [c for f in IMAGE_FEATURES for c in images[f]]
    return images[feature]


def _params_validator(action_params: dict) -> Any:
    def validate(action: str, params: dict) -> bool:
        model = action_params.get(action)
        if model is None:
            return False
        try:
            model.model_validate(params)
        except Exception:
            return False
        return True

    return validate


def _install_fake_providers(router: Any, arm: str) -> None:
    """--dry-run: deterministic providers, no network, no cost."""
    from app.modules.ai.providers.base import LLMResult, Usage

    answers = {
        "image_classify": {"kind": "menu", "confidence": 0.9, "image_quality": "ok"},
        "menu_scan": {
            "kind": "menu",
            "image_quality": "ok",
            "items": [
                {
                    "name": "Chips",
                    "category": "side",
                    "price": {
                        "text": "Frw 1,500",
                        "amount": "1500",
                        "currency": "RWF",
                        "currency_evidence": "code",
                        "evidence_text": "Frw",
                        "confidence": 0.9,
                    },
                    "description": None,
                    "name_confidence": 0.9,
                    "source_text": None,
                }
            ],
        },
        "dish_analysis": {
            "kind": "dish",
            "image_quality": "ok",
            "dish_name": "Chips",
            "dish_name_confidence": 0.9,
            "category": "side",
            "category_confidence": 0.9,
            "ingredients": [
                {
                    "name": "Potato",
                    "qty_per_portion": 0.25,
                    "unit": "kg",
                    "ingredient_id": None,
                    "confidence": 0.8,
                }
            ],
        },
        "document_scan": {
            "kind": "delivery_note",
            "image_quality": "ok",
            "supplier_name": None,
            "document_date": None,
            "lines": [
                {
                    "name": "Tomatoes",
                    "quantity_text": "25",
                    "unit": "kg",
                    "unit_price": None,
                    "line_total": None,
                    "confidence": 0.9,
                }
            ],
        },
        "assistant": {
            "type": "clarification",
            "reply_text": "How many portions?",
            "question": "How many portions?",
            "options": ["10", "20"],
        },
    }

    class Fake:
        def __init__(self, name: str) -> None:
            self.name = name

        def is_configured(self) -> bool:
            return True

        def warm_up(self) -> None:
            return None

        async def generate(self, request: Any, timeout_seconds: float) -> LLMResult:
            answer = answers.get(request.feature, answers["assistant"])
            model = "muse-spark-1.3" if self.name == "meta" else "claude-sonnet-5-5"
            return LLMResult(
                text=json.dumps(answer),
                provider=self.name,
                model=model,
                latency_ms=5,
                finish_reason="stop",
                usage=Usage(input_tokens=100, output_tokens=20),
            )

    router._providers = {"anthropic": Fake("anthropic"), "meta": Fake("meta")}


# ── Report ────────────────────────────────────────────────────────────────────

BUDGETS_S = {
    "classify": "AI_TIMEOUT_CLASSIFY_MS",
    "menu": "AI_TIMEOUT_EXTRACT_MS",
    "dish": "AI_TIMEOUT_EXTRACT_MS",
    "document": "AI_TIMEOUT_EXTRACT_MS",
    "assistant": "AI_CHAT_TIMEOUT_SECONDS",
}
MAIN_METRICS = {
    "classify": ["accuracy"],
    "menu": ["item_recall", "price_accuracy", "category_accuracy", "clarify_recall"],
    "dish": ["ingredient_precision", "ingredient_recall"],
    "document": ["line_recall", "quantity_accuracy", "price_accuracy", "clarify_recall"],
    "assistant": [
        "pass_rate",
        "action_correct",
        "params_valid",
        "one_question",
        "language",
        "grounded",
        "clarify_kind",
    ],
}


def _mean(values: list[float | None]) -> float | None:
    vals = [v for v in values if v is not None]
    return sum(vals) / len(vals) if vals else None


def _pct(values: list[float], p: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    return ordered[max(1, math.ceil(p / 100 * len(ordered))) - 1]


def summarise(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Metrics for one arm and feature."""
    calls = [r for r in rows if not r["case"].startswith("_")]
    if not calls:
        return {}
    feature = calls[0]["feature"]
    g = [r["grade"] for r in calls]
    lat = [r["latency_ms"] for r in calls if r.get("latency_ms")]
    out: dict[str, Any] = {
        "calls": len(calls),
        "schema_valid": _mean([1.0 if r["http"] == 200 else 0.0 for r in calls]),
        "p50_ms": _pct(lat, 50),
        "p95_ms": _pct(lat, 95),
        "cost_per_call": _mean([r["cost_usd"] for r in calls]),
    }
    if feature == "classify":
        from evallib.grading import calibration

        out["accuracy"] = _mean([1.0 if x["correct"] else 0.0 for x in g])
        out["unavailable_rate"] = _mean(
            [1.0 if x.get("unavailable") else 0.0 for x in g]
        )
        cal = calibration(
            [
                (x["confidence"], x["correct"])
                for x in g
                if x.get("confidence") is not None
            ]
        )
        out["brier"], out["ece"] = cal["brier"], cal["ece"]
    elif feature == "menu":
        out["item_recall"] = _mean([x.get("recall") for x in g])
        out["item_precision"] = _mean([x.get("precision") for x in g])
        out["price_accuracy"] = _mean([x.get("price_accuracy") for x in g])
        out["category_accuracy"] = _mean([x.get("category_accuracy") for x in g])
        out.update(clarify_metrics(g))
    elif feature == "dish":
        out["ingredient_precision"] = _mean([x.get("precision") for x in g])
        out["ingredient_recall"] = _mean([x.get("recall") for x in g])
        out["link_rate"] = _mean([x.get("link_rate") for x in g])
    elif feature == "document":
        out["line_recall"] = _mean([x.get("line_recall") for x in g])
        out["quantity_accuracy"] = _mean([x.get("quantity_accuracy") for x in g])
        out["price_accuracy"] = _mean([x.get("price_accuracy") for x in g])
        out["total_accuracy"] = _mean(
            [1.0 if x["total_ok"] else 0.0 for x in g if x.get("total_ok") is not None]
        )
        flags = [x["arithmetic"] for x in g if x.get("arithmetic")]
        want = sum(len(f["expected"]) for f in flags)
        out["arithmetic_flag_recall"] = (
            None if not want else sum(len(f["expected"]) - len(f["missed"]) for f in flags) / want
        )
        out["arithmetic_false_flags"] = sum(len(f["false_flags"]) for f in flags)
        out.update(clarify_metrics(g))
    else:

        def check(name: str) -> float | None:
            vals = [x["checks"].get(name) for x in g if x.get("checks")]
            return _mean([1.0 if v else 0.0 for v in vals if v is not None])

        out["pass_rate"] = _mean([1.0 if x.get("passed") else 0.0 for x in g])
        out["action_correct"] = check("action")
        out["params_valid"] = check("params_valid")
        out["one_question"] = check("one_question")
        out["language"] = check("language")
        out["language_unknown"] = sum(1 for x in g if x.get("language") == "unknown")
        out["grounded"] = check("grounded")
        out["clarify_kind"] = check("clarify_kind")
        writes = [r for r in rows if r["case"] == "_writes"]
        out["unconfirmed_writes"] = sum(
            1 for r in writes if r.get("unconfirmed_writes")
        )
        decode = next((r["decode_stats"] for r in rows if r["case"] == "_decode"), {})
        if decode.get("params_string"):
            out["params_decode_fail_rate"] = (
                decode.get("params_decode_fail", 0)
                + decode.get("params_validation_fail", 0)
            ) / decode["params_string"]
        out["decode_stats"] = decode
    return out


def clarify_metrics(grades: list[dict[str, Any]]) -> dict[str, Any]:
    """Clarifying questions over a feature's cases: recall (asked when the key says to ask)
    and false-alarm rate (cases where a question of that kind was asked but not expected),
    overall and per kind."""
    rows = [x["clarify"] for x in grades if x.get("clarify")]
    if not rows:
        return {}
    want = sum(len(r["expected"]) for r in rows)
    kinds = sorted({k for r in rows for k in r["expected"] + r["asked"]})
    per_kind = {}
    for kind in kinds:
        expected = [r for r in rows if kind in r["expected"]]
        not_expected = [r for r in rows if kind not in r["expected"]]
        per_kind[kind] = {
            "recall": _mean([1.0 if kind in r["hits"] else 0.0 for r in expected]),
            "false_alarm_rate": _mean(
                [1.0 if kind in r["false_alarms"] else 0.0 for r in not_expected]
            ),
        }
    return {
        "clarify_recall": None if not want else sum(len(r["hits"]) for r in rows) / want,
        "clarify_false_alarm_rate": _mean(
            [1.0 if r["false_alarms"] else 0.0 for r in rows]
        ),
        "clarify_by_kind": per_kind,
    }


def case_scores(rows: list[dict[str, Any]]) -> dict[str, float]:
    """Mean score per case across runs (assistant: pass; images: the main metrics)."""
    per: dict[str, list[float]] = defaultdict(list)
    for r in rows:
        if r["case"].startswith("_"):
            continue
        g = r["grade"]
        f = r["feature"]
        if f == "assistant":
            score = 1.0 if g.get("passed") else 0.0
        elif f == "classify":
            score = 1.0 if g.get("correct") else 0.0
        elif f == "menu":
            score = _mean([g.get("recall"), g.get("price_accuracy")]) or 0.0
        elif f == "dish":
            score = _mean([g.get("precision"), g.get("recall")]) or 0.0
        else:
            score = (
                _mean(
                    [
                        g.get("line_recall"),
                        g.get("quantity_accuracy"),
                        g.get("price_accuracy"),
                    ]
                )
                or 0.0
            )
        per[r["case"]].append(score)
    return {k: sum(v) / len(v) for k, v in per.items()}


def recommend_budget_s(
    feature: str, claude_p95: float | None, meta_p95: float | None, share: float = 0.6
) -> int | None:
    """Classify (no failover): 1.25 x Claude p95. Others: the smallest budget T where Claude's
    p95 fits its share (p95 <= share*T) and Meta's p95 fits the rest (p95 <= (1-share)*T)."""
    if claude_p95 is None:
        return None
    if feature == "classify":
        return math.ceil(claude_p95 * 1.25 / 1000)
    need = claude_p95 / share
    if meta_p95 is not None:
        need = max(need, meta_p95 / (1 - share))
    return math.ceil(need / 1000)


def cmd_report(args: argparse.Namespace) -> int:
    _backend_imports()
    sys.path.insert(0, str(ROOT))
    from app.core.config import settings

    run_dir = Path(args.run_dir)
    meta = json.loads((run_dir / "run.json").read_text())
    ledger = json.loads((run_dir / "ledger.json").read_text())
    rows_by: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for arm_file in sorted(run_dir.glob("*.jsonl")):
        for line in arm_file.read_text(encoding="utf-8").splitlines():
            r = json.loads(line)
            rows_by[(r["arm"], r["feature"])].append(r)
    arms = [a for a in ARMS if any(k[0] == a for k in rows_by)]
    lines = [
        f"# Phase 8 parity report: {meta['run_id']}",
        "",
        f"Runs per case: {meta['runs']} · arms: {', '.join(arms)} · "
        f"spent ${ledger['spent_usd']:.4f} of ${meta['budget_usd']:.2f}"
        + (f" · **stopped: {ledger['stopped']}**" if ledger.get("stopped") else "")
        + (" · DRY RUN (fake providers)" if meta.get("dry_run") else ""),
        "",
        "## Actual spend per arm",
        "",
        "| arm | USD | calls |",
        "|---|---|---|",
    ]
    for arm in arms:
        calls = sum(
            len([r for r in rs if not r["case"].startswith("_")])
            for (a, _), rs in rows_by.items()
            if a == arm
        )
        lines.append(
            f"| {arm} | ${ledger.get('by_arm', {}).get(arm, 0.0):.4f} | {calls} |"
        )
    lines += [
        f"| **total** | **${ledger['spent_usd']:.4f}** of ${meta['budget_usd']:.2f} cap | |",
        "",
    ]
    for feature in FEATURES:
        sums = {arm: summarise(rows_by.get((arm, feature), [])) for arm in arms}
        sums = {a: s for a, s in sums.items() if s}
        if not sums:
            continue
        keys = [
            k
            for k in next(iter(sums.values()))
            if k not in ("decode_stats", "clarify_by_kind")
        ]
        lines += [
            f"## {feature}",
            "",
            "| metric | " + " | ".join(sums) + " |",
            "|---|" + "---|" * len(sums),
        ]
        for k in keys:
            lines.append(
                f"| {k} | "
                + " | ".join(_fmt(k, s.get(k)) for s in sums.values())
                + " |"
            )
        kinds = sorted({k for s in sums.values() for k in s.get("clarify_by_kind", {})})
        if kinds:
            lines += [
                "",
                "Clarifying questions by kind (recall / false-alarm rate):",
                "",
                "| kind | " + " | ".join(sums) + " |",
                "|---|" + "---|" * len(sums),
            ]
            for kind in kinds:
                cells = []
                for s in sums.values():
                    k = s.get("clarify_by_kind", {}).get(kind, {})
                    cells.append(
                        f"{_fmt('r', k.get('recall'))} / {_fmt('f', k.get('false_alarm_rate'))}"
                    )
                lines.append(f"| {kind} | " + " | ".join(cells) + " |")
        budget_setting = BUDGETS_S[feature]
        budget_s = getattr(settings, budget_setting) / (
            1 if budget_setting.endswith("SECONDS") else 1000
        )
        lines += ["", f"Release bar (current budget {budget_s:g} s):", ""]
        meta_s = sums.get("meta", {})
        for arm in [a for a in sums if a != "meta"]:
            s = sums[arm]
            bar = []
            for m in MAIN_METRICS[feature]:
                if s.get(m) is not None and meta_s.get(m) is not None:
                    bar.append(
                        f"{m} {'≥' if s[m] >= meta_s[m] else '<'} Meta "
                        f"({_fmt(m, s[m])} vs {_fmt(m, meta_s[m])})"
                    )
            bar.append(
                f"schema-valid {_fmt('schema_valid', s.get('schema_valid'))} "
                f"{_ok((s.get('schema_valid') or 0) >= 0.99)} (≥ 99%)"
            )
            if s.get("p95_ms") is not None:
                bar.append(
                    f"p95 {s['p95_ms'] / 1000:.1f} s {_ok(s['p95_ms'] / 1000 <= budget_s)} "
                    f"(≤ {budget_s:g} s)"
                )
            if feature == "assistant":
                bar.append(
                    f"unconfirmed writes {s.get('unconfirmed_writes')} "
                    f"{_ok(not s.get('unconfirmed_writes'))}"
                )
                if s.get("params_decode_fail_rate") is not None:
                    bar.append(
                        "params decode/validation failure rate "
                        f"{s['params_decode_fail_rate']:.1%} (first answers, before repair)"
                    )
            rec = recommend_budget_s(feature, s.get("p95_ms"), meta_s.get("p95_ms"))
            if rec:
                bar.append(f"recommended budget {rec} s")
            lines.append(f"- **{arm}**: " + "; ".join(bar))
        if "claude-low" in sums and "claude-medium" in sums:
            lo, med = sums["claude-low"], sums["claude-medium"]
            main = MAIN_METRICS[feature][0]
            gain = (med.get(main) or 0) - (lo.get(main) or 0)
            choice = "medium" if gain >= 0.02 else "low"
            lines.append(
                f"- **effort**: {choice} ({main} medium - low = {gain:+.1%}; "
                "rule: medium only if ≥ +2 points)"
            )
        if "meta" in sums:
            meta_cases = case_scores(rows_by[("meta", feature)])
            for arm in [a for a in sums if a != "meta"]:
                worse = [
                    (c, sc, meta_cases[c])
                    for c, sc in case_scores(rows_by[(arm, feature)]).items()
                    if c in meta_cases and sc < meta_cases[c]
                ]
                if worse:
                    lines += ["", f"Cases where **{arm}** is worse than Meta:", ""]
                    lines += [
                        f"- `{c}`: {sc:.2f} vs Meta {m:.2f}: fix: _(to fill in)_"
                        for c, sc, m in sorted(worse)
                    ]
        lines.append("")
    report = "\n".join(lines)
    (run_dir / "report.md").write_text(report, encoding="utf-8")
    print(report)
    return 0


def _ok(passed: bool) -> str:
    return "PASS" if passed else "FAIL"


def _fmt(key: str, v: Any) -> str:
    if v is None:
        return "n/a"
    if key.endswith("_ms"):
        return f"{v / 1000:.1f} s"
    if key == "cost_per_call":
        return f"${v:.4f}"
    if isinstance(v, float) and key not in ("brier", "ece"):
        return f"{v:.1%}"
    if isinstance(v, float):
        return f"{v:.3f}"
    return str(v)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("plan")
    p.add_argument("--runs", type=int, default=3)
    p.add_argument("--budget-usd", type=float, default=25.0)
    p.add_argument(
        "--assume-images",
        help="estimate with N menu,dish,document,junk images (e.g. 30,20,10,10)",
    )
    p.add_argument(
        "--include-drafts",
        action="store_true",
        help="also list and price draft answer keys",
    )
    r = sub.add_parser("run")
    r.add_argument("--runs", type=int, default=3)
    r.add_argument("--budget-usd", type=float, default=25.0)
    r.add_argument("--arms", type=lambda s: s.split(","), default=list(ARMS))
    r.add_argument("--features", type=lambda s: s.split(","), default=list(FEATURES))
    r.add_argument("--dry-run", action="store_true")
    r.add_argument(
        "--include-drafts",
        action="store_true",
        help="dry runs only: also use draft answer keys",
    )
    r.add_argument(
        "--keep-env-key",
        action="store_true",
        help="use ANTHROPIC_API_KEY from the environment",
    )
    r.add_argument("--out", type=Path, default=ROOT / "results")
    w = sub.add_parser("worker")
    w.add_argument("--arm", required=True, choices=list(ARMS))
    w.add_argument("--run-dir", required=True)
    w.add_argument("--runs", type=int, default=3)
    w.add_argument("--budget-usd", type=float, default=25.0)
    w.add_argument("--features", type=lambda s: s.split(","), default=list(FEATURES))
    w.add_argument("--dry-run", action="store_true")
    w.add_argument("--include-drafts", action="store_true")
    rep = sub.add_parser("report")
    rep.add_argument("run_dir")
    args = parser.parse_args()
    return {
        "plan": cmd_plan,
        "run": cmd_run,
        "worker": cmd_worker,
        "report": cmd_report,
    }[args.cmd](args)


if __name__ == "__main__":
    raise SystemExit(main())
