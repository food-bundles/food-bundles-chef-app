# AI providers: Anthropic primary, Meta fallback

Status: Phase 8, Step 1 (provider layer, failover and tests). Chat streaming is Step 1b,
and the eval parity report is Step 2. Anthropic specifics were verified against the
Claude API docs and the installed SDK on **2026-11-18**: Python SDK `anthropic==2.10.0`,
API version `2026-10-21`.

## Architecture

```mermaid
flowchart LR
  App[Mobile app] -->|"/kitchens/{id}/ai/*"| API[FastAPI AI endpoints]
  API --> Svc[Gateway services<br/>classify · menu · dish · document · assistant]
  API --> QA[Quality assessment<br/>policy: meta_only]
  API --> STT[Transcription<br/>Meta only, not routed]
  Svc --> SC[structured_call<br/>prompt · schema · repair]
  SC --> R[ProviderRouter]
  QA --> R
  R -->|skip checks| K[Kill switch · Redis]
  R -->|budget| S[(ai_spend_daily)]
  R --> B{Breaker per provider}
  B --> A[AnthropicProvider<br/>anthropic SDK]
  B --> M[MetaProvider<br/>existing Meta client]
  R --> L[ai_call log]
```

| Layer | File |
|---|---|
| Neutral request/result and typed errors | `backend/app/modules/ai/providers/base.py` |
| Router (failover, retries, repair, logs) | `backend/app/modules/ai/providers/router.py` |
| Anthropic adapter | `backend/app/integrations/anthropic/client.py` |
| Meta adapter (wraps the existing client unchanged) | `backend/app/modules/ai/providers/meta_provider.py` |
| Model tiers, capabilities, prices, wire schema | `backend/app/modules/ai/providers/catalog.py` |
| Circuit breaker | `backend/app/modules/ai/providers/breaker.py` |
| Daily spend and budgets | `backend/app/modules/ai/providers/spend.py`, table `ai_spend_daily` |
| Kill switch | `backend/app/modules/ai/providers/killswitch.py` |
| Health and startup config check | `backend/app/modules/ai/providers/health.py` |
| Ops endpoints | `backend/app/modules/ai/ops_router.py` |

Feature code calls only `structured_call` (or, for quality assessment, the router), and
never a provider directly.

## Failover rules

The first rows **skip** the primary without calling it: the log has
`outcome=primary_skipped` and a `skip_reason`, and `fallback_reason` stays empty. The
other rows call the primary first: a real failover logs `outcome=fallback` with a
`fallback_reason`.

| Condition | Behaviour | Logged as |
|---|---|---|
| `ANTHROPIC_API_KEY` empty | Skip Anthropic, Meta serves | `skip_reason=no_key` |
| Only the misspelled `ANTROPIC_API_KEY` set | Value never used. Startup warning, `/ai/health` shows `primary_misconfigured` | `skip_reason=no_key`, `env_name_typo` |
| `ANTHROPIC_ENABLED=false` | Skip Anthropic (restart required) | `skip_reason=disabled` |
| Kill switch on | Skip within about 5 s on every instance, no restart | `skip_reason=kill_switch` |
| Breaker open | Skip until cooldown, then one probe | `skip_reason=breaker_open` |
| Daily budget reached | Per `AI_BUDGET_EXCEEDED_ACTION`: `fallback` → Meta (skip), `cheaper_tier` → FAST model, `block` → 429 `AI_BUDGET_EXCEEDED` | `skip_reason=budget` |
| Timeout, including the router's own deadline | Fail over | `fallback_reason=timeout` |
| Network or DNS error | Retry (backoff + jitter), then fail over | `network` |
| 5xx, or 529 `overloaded_error` | Retry, then fail over | `overloaded` |
| 429 | Retry, honouring `retry-after` if it fits the budget, then fail over | `rate_limited` |
| 401 / 403 | Fail over. Logged `critical`; provider flagged misconfigured | `auth` |
| Output invalid after ONE repair | Fail over | `schema_fail` |
| Unexpected SDK exception | Fail over | `unexpected` |
| 400, 404 model, 413 | **No failover.** 502 `AI_PROVIDER_ERROR`, logged at `error` level (our bug) | `bad_request` |
| Model refusal (`stop_reason: refusal`) | **No failover, never retried on Meta.** 422 `AI_REFUSED`; the app shows a localized "I can't help with that" | `refused` |
| Both providers attempted and failed, or none available | 503 `AI_UNAVAILABLE`; the app shows "AI is temporarily unavailable" and manual flows work | `both_failed` |
| Only Meta attempted (no key) and it fails | Same errors as before Phase 8: 504 `AI_TIMEOUT`, 422 `AI_BAD_OUTPUT`, 502 `AI_PROVIDER_ERROR` | the error kind |

Retries are at most `AI_ROUTER_MAX_RETRIES` (capped at 2) per provider. They happen only
before any output is returned, and only while the time budget allows. All routed calls
are side-effect free: the model only *proposes*. Writes happen later, after the chef
confirms an Action Card, through the normal APIs with idempotency keys. A failover
therefore can never execute a write twice.

**Time budgets include the fallback.** When a fallback exists, the primary gets
`AI_PRIMARY_BUDGET_SHARE` (default 60 %) of the feature budget. On the last provider, a
repair gets at least 3 s, as before Phase 8. The router enforces every attempt's deadline
with `asyncio.wait_for`, because httpx timeouts apply per phase (connect, write, read):
before this, a 10 s classify was measured running for 18.7 s.

**Measured latency (2026-11-18, dev, synthetic images):**

| Feature | Claude | Meta |
|---|---|---|
| Classify | 1.8–5.8 s (Haiku) | 7.6–11.7 s |
| Menu scan | 4.6–6.9 s (Sonnet) | 26.8 s |
| Dish photo | 4.2–6.0 s (Sonnet) | 22.3 s |
| Assistant turn | 2.2–3.0 s (Sonnet) | 12.3–13.6 s |

When the primary fails fast (auth, 5xx), Meta has almost the whole budget. When the
primary *times out*, Meta gets only the remaining 40 %, which is less than Meta needs
for menu and dish (12 s of 30 s). The budgets and the share are tuned in Step 2.

## Behaviour consistency

- **Same schemas for both providers.** The server validates every answer with the Pydantic
  model, and the app validates again with zod.
- **Anthropic gets JSON through structured outputs** (`output_config.format`). Keywords the
  API rejects with a 400 (`minimum`, `maxLength`, `pattern`, `maxItems`, …) are stripped
  from the *wire* schema only (`catalog.wire_schema`); validation still uses the full model.
- **The Assistant keeps the JSON-proposal format.** In its wire schema
  (`ModelAgentTurnWire`) `params` is a JSON-encoded *string*. A free-form dict only
  allows `{}` under structured outputs, and the union of the eight action parameter
  models is rejected by the API ("The compiled grammar is too large", verified live
  2026-11-18; a flattened single object is rejected as "Schema is too complex").
  `ModelAgentTurn` decodes the string and validates it against the typed params model of
  the chosen action, exactly as it validates Meta's dict. Action Cards and
  `resolve_references` are unchanged.
- **No temperature on Claude 5.5 models.** These models reject sampling parameters with a
  400, and SDK 2.x has no `temperature` argument. The capability map
  (`AI_MODEL_CAPABILITIES`) decides per model, and unknown models get no temperature and
  no effort. Determinism comes from structured outputs plus server validation, with
  `effort=low` for classification. Effort for extraction and chat is chosen from the
  Step 2 evals. Meta settings are unchanged.
- **`output_config` takes `format` and `effort` together.** Verified live on 2026-11-18
  for `claude-haiku-5-5` and `claude-sonnet-5-5`, with effort `low` and `medium`: every
  call returned 200 with schema-valid JSON. The capability map keeps
  `supports_effort=true` for both.
- **Prompts** live in `prompts/<feature>/<version>/meta.md`, byte-identical to the
  pre-Phase-8 files. A provider-specific `anthropic.md` beside it is used only where
  needed; none is needed yet, because every prompt already demands JSON only and treats
  text inside images as data, not instructions.
- **Locale** is passed on every call, and replies come back in EN/FR/RW. Dish names stay
  as written.

## Configuration

All values are server environment variables. `backend/.env.example` holds placeholders
only.

| Variable | Default | Notes |
|---|---|---|
| `AI_PRIMARY_PROVIDER` / `AI_FALLBACK_PROVIDER` | `anthropic` / `meta` | Fallback may be `none` |
| `ANTHROPIC_API_KEY` | empty | Empty means Meta only (identical to before) |
| `ANTHROPIC_ENABLED` | `true` | Hard off switch (restart) |
| `ANTHROPIC_MODEL_FAST` / `_STANDARD` / `_ADVANCED` | `claude-haiku-5-5` / `claude-sonnet-5-5` / `claude-opus-5-5` | Tiers: classification = fast; menu, dish, document and assistant = standard; advanced only if evals prove it is needed |
| `ANTHROPIC_EFFORT_CLASSIFY` / `_EXTRACT` / `_CHAT` | `low` | |
| `AI_TIMEOUT_CLASSIFY_MS` / `_EXTRACT_MS` | 15000 / 30000 | Total budget, fallback included, enforced by the router (`asyncio.wait_for`). Classify was 10000; raised because Meta alone takes 7.6–9.8 s (measured 2026-11-18) |
| `AI_TIMEOUT_CHAT_TTFT_MS` | 8000 | Used from Step 1b (streaming). Until then the Assistant uses `AI_CHAT_TIMEOUT_SECONDS=30` |
| `AI_PRIMARY_BUDGET_SHARE` | 0.6 | |
| `AI_ROUTER_MAX_RETRIES` | 1 | 0–2 |
| `AI_BREAKER_FAILURE_THRESHOLD` / `AI_BREAKER_COOLDOWN_MS` | 5 / 30000 | In-process, per instance |
| `AI_DAILY_BUDGET_USD` / `AI_KITCHEN_DAILY_BUDGET_USD` | 0 (off) | |
| `AI_BUDGET_EXCEEDED_ACTION` | `fallback` | `cheaper_tier`, `fallback` or `block` |
| `AI_MODEL_CAPABILITIES` / `AI_MODEL_PRICES` | see `config.py` | JSON overrides |
| `AI_OPS_TOKEN` | empty | Protects `/api/v1/ai/*`; empty means the endpoints return 404 |
| Existing Meta variables | unchanged | `MODEL_API_KEY`, `META_MUSE_SPARK_MODEL`, … |

The startup check logs a warning, and never crashes, when the primary is unconfigured,
disabled, or set under the misspelled name. It also warns when `ANTHROPIC_API_KEY` in the
process environment (for example a Windows user variable) overrides a *different* value
in `backend/.env`: process variables win, so a stale variable silently replaces the key
in `.env`. Only the fact is logged, never either value.

Startup also builds the Anthropic SDK client, so the first chef request does not pay the
import (measured: several seconds on a cold process).

## Cost model

Prices are USD per million tokens, from the Claude pricing table on 2026-11-18. They live
in `AI_MODEL_PRICES`.

| Model | Input | Output | Cache read | Cache write (5 min) |
|---|---|---|---|---|
| `claude-haiku-5-5` | 0.10 | 0.50 | 0.01 | 0.125 |
| `claude-sonnet-5-5` | 2.00 | 10.00 | 0.10 | 2.50 |
| `claude-opus-5-5` | 4.00 | 20.00 | 0.20 | 5.00 |
| Meta Muse Spark | 0 (not tracked) | | | Fill in from Meta's pricing page |

- Cost per call is calculated from the response `usage`: input, output, cache-read and
  cache-write tokens.
- Every billed attempt is recorded in `ai_spend_daily`, including failed and refused
  ones. Each attempt is written once globally and once per kitchen, with an atomic upsert.
- The system prompt is marked for prompt caching. Prompts below the model's minimum
  cacheable length simply don't cache, without any error. `cached_tokens` in the logs
  shows the real hit rate.
- **Image limits.** Verified against the Claude vision docs on 2026-11-18:
  - Formats: JPEG, PNG, GIF and WebP.
  - Size and dimensions: at most 10 MB per image (base64), up to 8000×8000 px.
  - Claude 4.7 and later models (including the 5.5 tier) take a long edge up to 2,576 px
    and up to 4,784 visual tokens. Larger images are downscaled.
  - Cost: `⌈w/28⌉ × ⌈h/28⌉` visual tokens per image.

  The app already resizes images (about 1600 px for menus, 1024 px for dishes) and sends
  JPEG under 1 MB, so both providers get the same input. A 1600×1200 menu photo costs
  58 × 43 = 2,494 visual tokens, about $0.005 on Sonnet 5.5. The server accepts only
  JPEG, PNG and WebP (`validate_image`).
- The Message Batches API is not used, because there are no non-interactive bulk AI jobs
  today.

## Observability

Each routed call logs one `ai_call` event with these fields:

- `feature`, `prompt_version`, `request_id`, `kitchen_id`
- `provider_attempted`, `provider_served`, `fallback_reason`, `model`
- `skip_reason`: why the primary was not called (no_key, disabled, kill_switch, budget,
  breaker_open)
- `latency_ms`, `input_tokens`, `output_tokens`, `cached_tokens` (cache reads),
  `cache_write_tokens`, `cost_usd`
- `outcome`: success, repaired, **primary_skipped** (the primary was not called; see
  `skip_reason`), **fallback** (the primary was called and failed; see `fallback_reason`),
  schema_fail, timeout, refused, bad_request, both_failed or budget_blocked
- `repaired`

The chef's action (accepted, edited or rejected) is logged separately as `ai_feedback`.
No prompts, images, answers or keys are logged.

Saved queries (structured JSON logs):

| Panel | Query |
|---|---|
| Fallback rate (real failovers) | `event=ai_call outcome=fallback` / `event=ai_call outcome in (success, repaired, fallback, schema_fail, timeout, both_failed)`, by `feature` and `fallback_reason` |
| Primary skipped | `event=ai_call outcome=primary_skipped` by `skip_reason`. Expected while the key is unset, `ANTHROPIC_ENABLED=false` or the kill switch is on; not an error |
| Error rate by provider | `event=ai_call outcome in (timeout, schema_fail, both_failed, bad_request)` grouped by `provider_attempted` |
| p95 latency | `event=ai_call` p95(`latency_ms`) by `feature`, `provider_served` |
| Cost per day / feature | `SELECT day, scope, provider, model, SUM(cost_usd) FROM ai_spend_daily GROUP BY 1,2,3,4`, plus `event=ai_call` sum(`cost_usd`) by `feature` |
| Schema-fail rate | `event=ai_call outcome=schema_fail` / all, by `feature` |

Alerts:

- Fallback rate above 10 % for 15 min, counting `outcome=fallback` only. Skipped calls
  (`outcome=primary_skipped`) are left out, so an intentionally disabled primary never
  pages anyone.
- `skip_reason=breaker_open` or `skip_reason=budget` for more than 15 min (the primary
  is being bypassed because of errors or spend, not by choice).
- Any `ai_provider_auth_failed`.
- `ai_budget_alert` (80 % of a cap) and `ai_budget_reached`.

## Runbook

**Check status:** `curl -H "X-Ops-Token: $AI_OPS_TOKEN" https://<api>/api/v1/ai/health`. It
shows configured, enabled, kill switch, breaker state, last success, p95 and the
misconfiguration reason for each provider. It never shows key material.

**Turn the primary off instantly (no deploy, no restart):**

```bash
curl -X PUT -H "X-Ops-Token: $AI_OPS_TOKEN" -H "Content-Type: application/json" \
  -d '{"on": true}' https://<api>/api/v1/ai/kill-switch/anthropic
```

This takes effect on every instance within about 5 s; it needs Redis. To turn the primary
back on, send `{"on": false}`. The permanent switch is `ANTHROPIC_ENABLED=false` followed
by a restart.

**Rotate the Anthropic key:**

1. Create a new key in the Claude Console.
2. Set `ANTHROPIC_API_KEY` in the server secret store.
3. Restart.
4. Check that `/ai/health` shows `configured=true` and that `provider_served=anthropic` appears.
5. Revoke the old key.

If the old key is revoked first, calls fall back to Meta with `fallback_reason=auth`
until the new key is in place, so chefs are not blocked.

**Respond to alerts:**

- `auth`: check the key and the workspace. Meta is serving in the meantime.
- High fallback rate: check `/ai/health` (breaker open, last error) and the Claude status
  page. Flip the kill switch if errors are slowing chefs down.
- `ai_config_warning` "overrides a different value in .env": remove the stale
  `ANTHROPIC_API_KEY` from the host environment (on Windows, the user variables) and
  restart.
- Budget alert: raise the cap or set `AI_BUDGET_EXCEEDED_ACTION=cheaper_tier`.

**Rollback:** use the kill switch, or `ANTHROPIC_ENABLED=false`. Both route everything to
Meta exactly as before Phase 8.

## Known limits (Step 1)

- No chat streaming yet. Step 1b adds SSE with pre-first-token failover only; a
  mid-stream failure becomes "interrupted, retry".
- The breaker and latency stats are per instance. Spend is shared through Postgres.
- Quality assessment is routed but pinned to Meta (`meta_only`) until it has eval cases
  and passes parity.
- The `/ai/health` p95 covers only this instance's last 200 calls.
