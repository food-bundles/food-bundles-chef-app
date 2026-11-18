# Phase 8 eval parity: Claude vs Meta

Status: **harness ready, not run.** Waiting for real images and sign-off of the cases, grading
rules and budget below. Nothing in this folder calls a model until `parity.py run` is started.

## How it runs

```bash
python ai-evals/parity.py plan --runs 3                         # case list + cost estimate, no calls
python ai-evals/parity.py plan --runs 3 --assume-images 30,20,10,10
python ai-evals/parity.py run --dry-run --runs 1                 # fake providers: plumbing only
python ai-evals/parity.py run --runs 3 --budget-usd 15           # the real run (needs approval)
python -m pytest ai-evals/tests                                  # grader unit tests
```

(Use the backend virtualenv's Python. Provider keys are read from `backend/.env`.)

- **Arms:** `meta` (Muse Spark), `claude-low` and `claude-medium` (effort for extraction and the
  Assistant). Classification effort is fixed at low (approved), so classify runs on `meta` and
  `claude-low` only. Arms run in that order, so a budget stop can only shorten `claude-medium`.
- **No fallback inside an arm:** each arm runs with `AI_FALLBACK_PROVIDER=none`, so a Claude
  failure is scored as a Claude failure (never as a Meta answer), and vice versa.
- **Same code as production:** each arm is a separate process that drives the real FastAPI app
  in-process (same endpoints, router, prompts, schemas, validation, repair). Data goes to a
  throw-away SQLite database in the run folder, with the eval kitchen from
  `fixtures/eval-kitchen.json` seeded through the public API. No dev or production data is
  touched and `ai_spend_daily` stays clean.
- **3 runs per case.** Case scores are averaged over the runs.
- **Hard cost stop at $15:** a shared ledger records the cost of every call (from the router's
  `ai_call` log: real tokens × `AI_MODEL_PRICES`). Before each call the runner checks that
  `spent + worst-case cost of the next call ≤ $15`; otherwise it stops every arm and the report
  says where it stopped.
- **Output:** `ai-evals/results/parity-<timestamp>/` (git-ignored): one JSONL per arm (every
  call: grade, provider, model, latency, tokens, cost, response) and `report.md`.

## Grading rules (automatic)

All graders are pure functions in `evallib/grading.py`, unit-tested in `tests/test_grading.py`.

**Common to every feature**

| Metric | Rule |
|---|---|
| Schema-valid | The endpoint returned 200 with a response that passed server validation (after at most one repair). Release bar: ≥ 99 %. |
| Latency | Router-measured time per call (all turns for multi-turn Assistant cases); p50 and p95 per arm. |
| Cost | Real tokens from the provider × `AI_MODEL_PRICES` (Claude list prices; Meta Muse Spark Standard prices). |

**Classify** (every image case; the label is the case's `expected.kind`)

| Metric | Rule |
|---|---|
| Accuracy | Exact label. `classify_unavailable` counts as wrong. |
| Calibration | Brier score and expected calibration error (5 equal-width confidence bins) of confidence vs correct. Lower is better. |
| Unavailable rate | Share of `classify_unavailable` (the chef had to pick). |

**Menu**

| Metric | Rule |
|---|---|
| Item recall / precision | Names normalised (case, accents, punctuation removed), then fuzzy similarity ≥ 0.9 (`difflib` ratio), one-to-one, best pairs first. |
| Price accuracy | Exact integer RWF; an expected `null` must come back `null`. Denominator: all expected items (a missed item counts as a wrong price). |
| Category accuracy | Exact; only over expected items that have a category. |

**Dish** (against the eval kitchen's ingredient list)

| Metric | Rule |
|---|---|
| Ingredient precision / recall | A suggestion linked to a kitchen ingredient (`ingredient_id`) is read as that ingredient's name, otherwise its own name; matched to the expected names with the menu fuzzy rule. |
| Link rate | Expected ingredients that exist in the kitchen and were linked by id (what makes the recipe one tap). Reported, not part of the bar. |

**Delivery note / receipt**

| Metric | Rule |
|---|---|
| Line recall | Names matched with the menu fuzzy rule. |
| Quantity accuracy | Exact number (`"25"` = `25`). Denominator: all expected lines. |
| Price accuracy | `unit_price` and `line_total` each exact where the expectation gives them; both must match when both are given. |

**Assistant** (a case passes when every applicable check passes)

| Check | Rule |
|---|---|
| Type | `proposal`, `clarification` or `answer` as expected. For `out_of_domain` cases a refusal (`AI_REFUSED`) also passes. |
| Action | `action_type` equals the expected action. |
| Params valid | The proposal's params validate against the typed model of that action (the same `ACTION_PARAMS` models the server uses). |
| Params | Expected params match (names normalised, numbers exact, `*_contains` = substring). |
| One question | An ambiguous request gets a clarification with exactly one question (at most one `?`) and no proposal. A clear request must not be answered with a question. |
| Language | The reply is in the request language (heuristic function-word detector for EN/FR/RW). Replies it cannot decide are reported as `language_unknown` and listed for manual review, not counted. |
| Grounded (no invented numbers) | Every number in the reply must appear in the chef's messages or be justified by the kitchen data (stock, unit costs, prices, recipe quantities, each dish's food cost and food-cost %). 0 and 1, today's date, ISO dates and times like 14:05 are ignored. |
| Mentions | For answers that must quote a figure: one of the accepted spellings appears. |
| Unconfirmed writes | Stock and today's sales are snapshotted before and after the Assistant cases of each run. Any difference is an unconfirmed write. Release bar: 0. |
| Params decode failure rate (Claude) | Claude sends `params` as a JSON-encoded string. The runner inspects every raw Assistant answer before the repair step and counts strings that are not valid JSON objects or fail the typed model. |

## Release bar (per feature, per Claude arm vs Meta)

- Equal or better than Meta on the feature's main metrics: classify accuracy; menu item recall,
  price and category accuracy; dish ingredient precision and recall; document line recall,
  quantity and price accuracy; Assistant pass rate, action, params valid, one question,
  language and grounded.
- Schema-valid ≥ 99 %.
- 0 unconfirmed writes.
- p95 within the feature's time budget (classify 15 s, extraction 30 s, Assistant 30 s total
  until streaming).
- Cost within budget.

The report lists **every case where a Claude arm scores below Meta** (case score averaged over the
runs), with a line for the fix applied.

## Recommendations the report computes

- **Time budget per feature.** Classify (no failover): 1.25 × Claude p95. Other features: the
  smallest total budget T where Claude's p95 fits its 60 % share and Meta's p95 fits the
  remaining 40 %, i.e. `max(claude_p95 / 0.6, meta_p95 / 0.4)`.
- **Effort per feature.** `medium` only if it improves the feature's first main metric by at
  least 2 points over `low`; otherwise `low` (cheaper and faster).

## Known limits of the grading

- The language detector is a heuristic: very short replies ("Chips 20") come back `unknown` and
  are reviewed by hand. Kinyarwanda cases are drafts awaiting native review.
- "Grounded" checks numbers only, not words; a made-up claim without a number is not caught.
- Fuzzy name matching at 0.9 is strict: "Chips" vs "Chips (frites)" is a miss. Write expected
  names exactly as printed.
- Dish cases are graded against the eval kitchen's 7 ingredients; add the ingredients your dish
  photos need to `fixtures/eval-kitchen.json`.

## Case list and cost estimate

Generated by `python ai-evals/parity.py plan --runs 3`. Image cases are empty until the photos
arrive (`cases/README.md` explains the folder format).

### Image cases (cases/<feature>/<id>/)

- menu: 0 case(s)
- dish: 0 case(s)
- document: 0 case(s)
- junk: 0 case(s)

### Assistant cases (cases/assistant/cases.jsonl): 45

| id | lang | turns | expected |
|---|---|---|---|
| chat-en-01 | en | Record 12 chips sold today | proposal record_sale {"menu_item_name": "Chips", "portions_sold": 12} |
| chat-en-02 | en | twelve chips sold | proposal record_sale {"menu_item_name": "Chips", "portions_sold": 12} |
| chat-en-03 | en | We just received 20 kg of potatoes | proposal record_inventory {"ingredient_name": "Potato", "change": "add", "quantity": 20} |
| chat-en-04 | en | I counted the rice, there are 35 kg left | proposal record_inventory {"ingredient_name": "Rice", "change": "set", "quantity": 35} |
| chat-en-05 | en | Throw away 2 kg of tomatoes, they went bad | proposal record_inventory {"ingredient_name": "Tomato", "change": "remove", "quantity": 2} |
| chat-en-06 | en | How much potato do we have? | answer (mentions_any) |
| chat-en-07 | en | What's my food cost on Chips? | answer (mentions_any) |
| chat-en-08 | en | Add a new dish called Chapati for 500 francs as a side | proposal add_menu_item {"name_contains": "Chapati", "selling_price": 500, "category": "side"} |
| chat-en-09 | en | Record sales | clarification |
| chat-en-10 | en | Write me a poem about football | answer (out_of_domain) |
| chat-fr-01 | fr | Enregistre 8 portions de riz aux haricots vendues aujourd'hui | proposal record_sale {"menu_item_name": "Rice and beans", "portions_sold": 8} |
| chat-fr-02 | fr | On a reçu 5 litres d'huile | proposal record_inventory {"ingredient_name": "Cooking oil", "change": "add", "quantity": 5} |
| chat-fr-03 | fr | Il reste 6 kg de bœuf, je viens de compter | proposal record_inventory {"ingredient_name": "Beef", "change": "set", "quantity": 6} |
| chat-fr-04 | fr | Combien de pommes de terre avons-nous en stock ? | answer (mentions_any) |
| chat-fr-05 | fr | Quel est le prix des Chips ? | answer (mentions_any) |
| chat-fr-06 | fr | Quel est le coût matière des Chips ? | answer (mentions_any) |
| chat-fr-07 | fr | Ajoute un jus de mangue à 1200 francs dans les boissons | proposal add_menu_item {"name_contains": "mangue", "selling_price": 1200, "category": "drink"} |
| chat-fr-08 | fr | Jette 1 kg d'oignons abîmés | proposal record_inventory {"ingredient_name": "Onion", "change": "remove", "quantity": 1} |
| chat-fr-09 | fr | Enregistre les ventes | clarification |
| chat-fr-10 | fr | Qui a gagné le match de football hier ? | answer (out_of_domain) |
| chat-rw-01 | rw * | Andika ko twagurishije amasahani 10 ya Chips uyu munsi | proposal record_sale {"menu_item_name": "Chips", "portions_sold": 10} |
| chat-rw-02 | rw * | Twakiriye ibiro 30 by'ibirayi | proposal record_inventory {"ingredient_name": "Potato", "change": "add", "quantity": 30} |
| chat-rw-03 | rw * | Nabaze umuceri, hasigaye ibiro 25 | proposal record_inventory {"ingredient_name": "Rice", "change": "set", "quantity": 25} |
| chat-rw-04 | rw * | Ibirayi bisigaye mu bubiko ni bingahe? | answer (mentions_any) |
| chat-rw-05 | rw * | Igiciro cya Chips ni angahe? | answer (mentions_any) |
| chat-rw-06 | rw * | Twagurishije amasahani 6 ya Beef brochette | proposal record_sale {"menu_item_name": "Beef brochette", "portions_sold": 6} |
| chat-rw-07 | rw * | Kuramo ibiro 2 by'inyanya zangiritse | proposal record_inventory {"ingredient_name": "Tomato", "change": "remove", "quantity": 2} |
| chat-rw-08 | rw * | Ongeraho ifunguro rishya: Isombe ku mafaranga 1800 | proposal add_menu_item {"name_contains": "Isombe", "selling_price": 1800} |
| chat-rw-09 | rw * | Andika ibyagurishijwe | clarification |
| chat-rw-10 | rw * | Ndirimbira indirimbo | answer (out_of_domain) |
| p8-en-01 | en | record chips | clarification |
| p8-fr-01 | fr | Enregistre des Chips | clarification |
| p8-rw-01 | rw * | Andika Chips | clarification |
| p8-en-02 | en | We received tomatoes | clarification |
| p8-fr-02 | fr | On a reçu des tomates | clarification |
| p8-rw-02 | rw * | Twakiriye inyanya | clarification |
| p8-en-03 | en | record chips → 20 | proposal record_sale {"menu_item_name": "Chips", "portions_sold": 20} |
| p8-fr-03 | fr | Enregistre des Chips → 15 | proposal record_sale {"menu_item_name": "Chips", "portions_sold": 15} |
| p8-rw-03 | rw * | Andika Chips zagurishijwe → 12 | proposal record_sale {"menu_item_name": "Chips", "portions_sold": 12} |
| p8-en-04 | en | How much salt do we have? | answer (no_data) |
| p8-fr-04 | fr | Combien de sel avons-nous ? | answer (no_data) |
| p8-rw-04 | rw * | Umunyu dufite ni ungahe? | answer (no_data) |
| p8-en-05 | en | What's the food cost of a pizza? | answer (no_data) |
| p8-fr-05 | fr | Quel est le coût matière d'une pizza ? | answer (no_data) |
| p8-rw-05 | rw * | Ikiguzi cy'ibikoresho bya pizza ni angahe? | answer (no_data) |

`*` Kinyarwanda drafts, flagged for native review.

### Calls and cost estimate (3 runs per case)

| arm | feature | calls | est. USD |
|---|---|---|---|
| meta | classify | 0 | 0.00 |
| meta | menu | 0 | 0.00 |
| meta | dish | 0 | 0.00 |
| meta | document | 0 | 0.00 |
| meta | assistant | 144 | 1.52 |
| claude-low | classify | 0 | 0.00 |
| claude-low | menu | 0 | 0.00 |
| claude-low | dish | 0 | 0.00 |
| claude-low | document | 0 | 0.00 |
| claude-low | assistant | 144 | 3.02 |
| claude-medium | menu | 0 | 0.00 |
| claude-medium | dish | 0 | 0.00 |
| claude-medium | document | 0 | 0.00 |
| claude-medium | assistant | 144 | 3.96 |

**Estimated total: $8.50** (pessimistic token counts; hard stop at $15.00).

### Estimate with the expected image set (30 menus, 20 dishes, 10 documents, 10 junk)

| arm | feature | calls | est. USD |
|---|---|---|---|
| meta | classify | 210 | 1.52 |
| meta | menu | 90 | 1.01 |
| meta | dish | 60 | 0.73 |
| meta | document | 30 | 0.34 |
| meta | assistant | 144 | 1.52 |
| claude-low | classify | 210 | 0.16 |
| claude-low | menu | 90 | 2.14 |
| claude-low | dish | 60 | 1.58 |
| claude-low | document | 30 | 0.71 |
| claude-low | assistant | 144 | 3.02 |
| claude-medium | menu | 90 | 2.95 |
| claude-medium | dish | 60 | 2.24 |
| claude-medium | document | 30 | 0.98 |
| claude-medium | assistant | 144 | 3.96 |

**Estimated total: $22.88** (pessimistic token counts; hard stop at $15.00).

Scaling the 2026-11-18 smoke-test costs instead gives about $8.50 for the same set, but real menus with 20–40 items produce several times the output tokens of the 5-item test menu, so expect roughly $12–15. With the $15 cap the run may stop during `claude-medium`.
