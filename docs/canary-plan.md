# Canary plan: Anthropic as primary in RW kitchens (Phase 8 Step 3)

**Status: prepared, NOT applied.** Nothing in this file has been changed in production.
**GO/NO-GO: PENDING KEY VERIFICATION.** The preliminary eval ran on unverified answer keys
(see "Eval input" below). Only the features that pass the re-run on verified keys enter the
canary; remove any NO-GO feature from `AI_ANTHROPIC_CANARY_FEATURES` before stage 1.

- **Scope:** RW kitchens only. Features: `image_classify`, `menu_scan`, `dish_analysis`,
  `document_scan`. **The Assistant stays on Meta** (not in the feature list).
- **Mechanism** (`backend/app/modules/ai/providers/canary.py`): a stable hash of the kitchen
  id puts each kitchen in a bucket from 0 to 99. A request is in the canary when its feature
  is listed, its bucket is below the percent and its kitchen is in RW. The kitchens in the
  10 % stage stay in at 50 % and 100 %. Outside the canary, Meta serves alone and the call
  is logged with `outcome=primary_skipped skip_reason=canary`. That is the control group.
- **Config changes need a restart** of api and worker (settings are read at start). The kill
  switch is instant and needs no restart.

## Exact config per stage

Set these in the production secret store / environment, then restart `api` and `worker`.
JSON lists as shown.

| Variable | Stage 0: prepare | Stage 1: 10 % | Stage 2: 50 % | Stage 3: 100 % |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | (set, server only) | unchanged | unchanged | unchanged |
| `ANTHROPIC_ENABLED` | `true` | `true` | `true` | `true` |
| `AI_PRIMARY_PROVIDER` | `anthropic` | `anthropic` | `anthropic` | `anthropic` |
| `AI_FALLBACK_PROVIDER` | `meta` | `meta` | `meta` | `meta` |
| `AI_ANTHROPIC_CANARY_FEATURES` | `["image_classify","menu_scan","dish_analysis","document_scan"]` | same | same | same |
| `AI_ANTHROPIC_CANARY_COUNTRIES` | `["RW"]` | `["RW"]` | `["RW"]` | `["RW"]` |
| `AI_ANTHROPIC_CANARY_PERCENT` | `0` | `10` | `50` | `100` |
| `ANTHROPIC_EFFORT_CLASSIFY` | `low` | same | same | same |
| `ANTHROPIC_EFFORT_EXTRACT` | from the eval (see below) | same | same | same |
| Time budgets (`AI_TIMEOUT_*`) | from the eval (see below) | same | same | same |
| `AI_DAILY_BUDGET_USD` / `AI_KITCHEN_DAILY_BUDGET_USD` | set (e.g. 10 / 1) | 10 / 1 | 25 / 1 | 50 / 1 |

Stage 0 ships the code with the canary at 0 %, so production behaves as Meta-only for those
features (and every other feature too, except where Anthropic was already primary). Check
`/ai/health` (Anthropic `configured=true`) and that `skip_reason=canary` appears for the four
features before stage 1.

**Deploy prerequisite:** the worker and Redis must be running in production (the kill switch
needs Redis; see the hosting questions in `docs/deployment.md`). Rotate the Meta key first.

## Rollback (one change)

- **Instant, no restart:** turn on the kill switch:
  `curl -X PUT -H "X-Ops-Token: $AI_OPS_TOKEN" -H "Content-Type: application/json" -d '{"on": true}' https://<api>/api/v1/ai/kill-switch/anthropic`.
  Every instance routes to Meta within about 5 s.
- **Permanent:** `AI_ANTHROPIC_CANARY_PERCENT=0` and restart. Then turn the kill switch off.
- Rolling back one stage only (e.g. 50 % → 10 %): change the percent and restart.

## Monitoring queries

Canary cohort = `provider_attempted` contains `anthropic` for the four features.
Control cohort = `skip_reason=canary`. Compare the two every day.

| Panel | Query | Promote if (48 h) | Roll back if |
|---|---|---|---|
| Fallback rate | `event=ai_call outcome=fallback` / canary calls, by `feature`, `fallback_reason` | < 5 % | > 10 % for 15 min |
| Schema-fail rate | `event=ai_call outcome=schema_fail` / canary calls, by `feature` | < 1 % | > 3 % over 1 h |
| Refusals | `event=ai_call outcome=refused` count, by `feature` | 0 on normal use (each one read) | any refusal on a normal menu, dish or receipt photo |
| p95 latency | p95(`latency_ms`) by `feature`, `provider_served` | within the stage budget | > 1.5 × budget for 1 h |
| Cost per day | `SELECT day, provider, model, SUM(cost_usd) FROM ai_spend_daily WHERE scope='global' GROUP BY 1,2,3` | ≤ plan (stage budget) | `ai_budget_alert` (80 %) |
| Clarification rate per kind | `event=ai_clarification` count by `feature`, `kind` / calls of that feature, canary vs control | within ±50 % of control | > 2 × control for a kind |
| Chef feedback | `event=ai_feedback` by `action` (accepted / edited / rejected), canary vs control | rejected ≤ control + 5 points | rejected > 2 × control |
| Auth / config | `event=ai_provider_auth_failed`, `ai_config_warning` | none | any auth failure not fixed in 15 min |
| Breaker / budget skips | `outcome=primary_skipped skip_reason in (breaker_open, budget)` | none lasting 15 min | > 15 min |

**Sample size:** promote only after at least 200 canary calls per feature, or 7 days if
traffic is lower. Features with fewer calls promote on their own schedule.

## Promote criteria per stage

- **0 → 10 %:** health shows Anthropic configured, the kill switch tested in production
  (on, check `skip_reason=kill_switch`, off), and the verified-key eval says GO for the feature.
- **10 → 50 %:** 48 h at 10 % with every "Promote if" row green and ≥ 200 canary calls per
  feature.
- **50 → 100 %:** 48 h at 50 % with every row green, and cost per day within the stage
  budget.
- **Phase 8 done:** 7 days at 100 % with every row green (the finish line).

## Daily checklist (one page)

Every morning, about 10 minutes:

1. [ ] `/ai/health`: Anthropic `configured=true`, `enabled=true`, kill switch off, breaker closed,
       `redis_connected=true`.
2. [ ] Fallback rate per feature < 5 % (yesterday and last 24 h).
3. [ ] Schema-fail rate per feature < 1 %.
4. [ ] Refusals: 0, or each one read and explained.
5. [ ] p95 per feature within its budget.
6. [ ] Cost yesterday within the stage budget; no `ai_budget_alert`.
7. [ ] Clarification rate per kind: canary within ±50 % of control.
8. [ ] Chef feedback: rejected rate not above control + 5 points.
9. [ ] No `ai_provider_auth_failed`; no breaker or budget skips lasting 15 min.
10. [ ] Decide: stay, promote (48 h green and enough calls) or roll back (any red row).
       Write the decision and the numbers in the rollout log.

## Eval input (preliminary, unverified keys)

The proposed time budgets and effort come from the key-independent results of the
preliminary eval (`ai-evals/results/parity-*/report.md`). They are listed in
`docs/autonomous-run/FINAL-REPORT.md` and copied here once the run completes.

| Feature | Proposed budget | Proposed effort |
|---|---|---|
| image_classify | _(from the eval)_ | low (fixed) |
| menu_scan | _(from the eval)_ | _(from the eval)_ |
| dish_analysis | _(from the eval)_ | _(from the eval)_ |
| document_scan | _(from the eval)_ | _(from the eval)_ |
