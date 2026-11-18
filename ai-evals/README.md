# AI evals — Food Bundles Chef

Measures the AI features through the **real backend AI gateway** (the same endpoints the app calls),
so a prompt or model change can be checked against the release bar before it ships.

| Suite | Endpoint | What is measured |
|---|---|---|
| classify | `POST /kitchens/{id}/ai/classify-image` | kind accuracy on every image sample (menu / dish / receipt / delivery note / stock shelf / other) |
| menu | `POST …/ai/menu-extract` | schema-valid rate, item recall & precision, price accuracy (all and on `clear` photos), category accuracy |
| dish | `POST …/ai/dish-analyze` | schema-valid rate, ingredient match rate, stock-link rate (matched to the kitchen's ingredients), dish name and category |
| documents | `POST …/ai/document-extract` | schema-valid rate, line recall, quantity and unit-price accuracy |
| chat | `POST …/ai/agent` | tool-call correctness (action type + params), grounded answers, clarifications, refusals, **0 unconfirmed writes** |
| voice | `POST …/ai/transcribe` | word error rate (WER) per language; languages not enabled on the server are never sent |

Every suite also reports p50 / p95 latency. Cost per call is computed when you pass the server log and a
price config (see below).

## What is in this folder — and what is not

- `datasets/chat/tasks.jsonl` — **30 chat tasks** (10 English, 10 French, 10 Kinyarwanda) with expected
  results, written against the seeded kitchen in `fixtures/eval-kitchen.json`. The Kinyarwanda tasks are
  drafts flagged `needs_native_review`.
- `datasets/{menu,dish,documents}/manifest.jsonl` and `datasets/voice/{en,fr,rw}/manifest.jsonl` — **empty**.
  No photos or voice clips are included and no results have been produced yet: they must come from real
  kitchens, with consent. Collect at least:
  - 30 menu photos — printed, handwritten, blurry, angled, multi-language, RWF formats (`Frw`, `RWF`, `2.5k`)
  - 20 dish photos — **including the chicken dish photo that failed Scan Menu** (tag it `chicken-dish-regression`)
  - 10 delivery notes / receipts
  - 15 voice clips per language recorded in a working kitchen (background noise)
- `run_evals.py` — the runner. `evallib/` — scoring and seeding. `tests/` — unit tests for the scoring.
- `schemas/manifest.schema.json` — the manifest line format, including the expected output per suite.

## Adding samples

1. Put the file in the suite folder, e.g. `datasets/menu/images/menu-001.jpg`.
   Images must be prepared like the app does: JPEG, long edge ≤ 1600 px (dishes ≤ 1024 px), under 1 MiB,
   no GPS metadata. Audio: `.m4a` (AAC) or `.wav`, at most 60 s.
2. Add one line to the suite's `manifest.jsonl`:

   ```json
   {"id": "menu-001", "file": "images/menu-001.jpg", "language": "en", "tags": ["printed", "clear"], "consent": "Chef A, 2026-11-20", "expected": {"kind": "menu", "items": [{"name": "Chips", "price": 1500, "category": "side"}]}}
   ```

   Write names **exactly as they appear** on the menu or document (they are not translated). Prices are
   whole RWF; use `null` when no price is shown.
3. Never add photos showing faces, phone numbers or customer data. Record who consented in `consent`.

## Running

```bash
# From the repo root, using the backend virtualenv (it has httpx)
export EVAL_API_BASE_URL=http://localhost:8000/api/v1
export EVAL_ACCESS_TOKEN=...            # a chef access token for a test account — never commit it
python ai-evals/run_evals.py --seed     # creates a fresh "AI eval kitchen", runs every suite
python ai-evals/run_evals.py --seed --suites chat
python -m pytest ai-evals/tests         # scoring unit tests (no network)
```

`--seed` creates a new kitchen each run (ingredients, stock, menu, recipes from `fixtures/eval-kitchen.json`)
so chat expectations such as "Chips food cost = 200 RWF" are deterministic. Use a test account: the
seeded kitchens are real records.

The chat suite snapshots stock and today's sales before and after the run. Any difference counts as an
**unconfirmed write** (the assistant must only propose; nothing is written without the chef's Confirm).

Suites whose feature is switched off on the server (`GET …/ai/features`) are reported as skipped.

### Cost per call

The gateway logs one `ai_call` JSON line per model call with `request_id`, `model`, `prompt_tokens` and
`completion_tokens` (no prompt or image content). The runner tags every request with
`X-Request-ID: eval-<run>-<sample>`. To price a run:

1. Copy `price-config.example.json` to `price-config.json` and fill in the per-million-token prices from
   Meta's current pricing page. Prices are left empty on purpose — never guess them.
2. `python ai-evals/run_evals.py --seed --server-log backend.log --price-config ai-evals/price-config.json`

## Output and release bar

Each run writes `results/<timestamp>.json` (every call, request ids, prompt versions) and
`results/<timestamp>.md` (the summary table), and exits non-zero if a release-bar check fails:

| Check | Bar |
|---|---|
| Schema-valid rate, every feature | ≥ 99% |
| Menu price accuracy on clear photos | ≥ 90% |
| Unconfirmed writes | 0 |
| p95 extraction latency (menu, dish, documents) | ≤ 15 s on 4G |

Change the bar only with product-owner approval (`RELEASE_BAR` in `run_evals.py`).

**Re-run on every prompt or model change.** Prompt versions come back in each gateway response
(`prompt_version`, e.g. `menu_extract.v1`) and are stored per call in the results JSON.

## Kinyarwanda

Kinyarwanda outputs need review by a native speaker. Voice in Kinyarwanda stays disabled
(`AI_TRANSCRIPTION_LANGUAGES` without `rw`) until a provider passes this suite with clips recorded in
kitchens. The app then shows "Voice in Kinyarwanda isn't available yet" and keeps typing as the fallback.
