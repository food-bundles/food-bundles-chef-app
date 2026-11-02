# Backend Backlog

Priorities: P0 release-blocking, P1 MVP, P2 post-MVP, P3 exploration.

## Git, audit and setup
- BE001 [P0] Inspect Git state, branches, remotes and history.
- BE002 [P0] Audit mobile domain types, Zod, SQLite, repositories, stores and offline queue.
- BE003 [P0] Produce mobile/backend contract matrix and unresolved decisions.
- BE004 [P0] Safely create `feat/backend-project-startup` from `feat/project-startup-mobile`.
- BE005 [P0] Scaffold Python 3.12+/FastAPI and lockfile.
- BE006 [P0] PostgreSQL Compose, health/readiness, settings and Alembic.
- BE007 [P0] Ruff, typing, pytest, HTTPX and CI.
- BE008 [P1] Structured logs, request IDs and stable errors.

## Identity, tenancy and domain
- BE009 [P0] Phone OTP hashing, expiry, single-use and throttling.
- BE010 [P0] Token rotation/revocation.
- BE011 [P0] Chef profile and multiple kitchens.
- BE012 [P0] Kitchen authorization and PostgreSQL RLS tests.
- BE013 [P1] Archive/active kitchen.
- BE014 [P1] Restaurant link approval, scopes, revocation and audit.
- BE015 [P0] Catalog items, units, recipes and yield.
- BE016 [P0] Sales/portion history and inventory movements.
- BE017 [P0] Opening stock, days cover and low-stock calculations.
- BE018 [P0] Four-week weighted demand (40/20/20/20) and 10% buffer.
- BE019 [P0] Purchase quantity, unit conversion and rounding tests.

## Purchasing and receiving
- BE020 [P0] Food Bundles catalog/reference-price adapter.
- BE021 [P0] Purchase list generation and hand-calculation tests.
- BE022 [P0] Order draft/submit/status/history with idempotency.
- BE023 [P1] Checkout/payment only with approved provider contract.
- BE024 [P1] Decide restaurant approval/edit/reject/pay workflow placement.
- BE025 [P0] Delivery and crate/bag/tray records.
- BE026 [P0] Manual receiving with actual weight/count and price.
- BE027 [P0] Six quality dimensions, pass/watch/fail.
- BE028 [P0] Short delivery threshold >5%.
- BE029 [P0] Reference vs actual price provenance.
- BE030 [P1] AI-assisted receiving, advisory and chef-confirmed.
- BE031 [P1] Media validation, <1MB image target, retention and access.

## Offline sync
- BE032 [P0] Contract-derived sync endpoints and stable client IDs.
- BE033 [P0] Idempotency persistence and replay tests.
- BE034 [P0] Version/conflict and retry semantics.
- BE035 [P1] Batch acknowledgements, tombstones and observability.
- BE036 [P1] Mobile contract tests and integration docs.

## Meta AI provider foundation
- AI001 [P0] Verify current official docs, model availability, terms, pricing and endpoints.
- AI002 [P0] Provider-neutral interfaces, capability registry and routing.
- AI003 [P0] Server-side Meta Model API client and auth.
- AI004 [P0] Feature flags off by default and per-kitchen limits.
- AI005 [P0] Safe telemetry, usage/cost metadata, no-content-logging.
- AI006 [P0] Pydantic schemas, bounded retries and typed failures.
- AI007 [P0] Mocked provider contract tests; no live key required in CI.
- AI008 [P0] Privacy/data minimization and Standard/Contributor decision.
- AI009 [P1] Human-reviewed evaluation dataset and quality/cost/latency thresholds.

## Meta hosted models
- AI010 [P1] Muse Spark series for validated multimodal/structured tasks.
- AI011 [P1] Muse Wonder for complex reasoning when justified.
- AI012 [P1] SAM 3.1 segmentation for visible receiving regions; not freshness.
- AI013 [P1] Muse Voice Transcribe for optional chef dictation.
- AI014 [P2] Muse Image for labelled menu/marketing assets only.
- AI015 [P1] Media/audio validation, consent and retention.
- AI016 [P1] Manual receiving and core flows remain available during AI outage.

## Open weights and developer tooling
- AI017 [P2] Evaluate Muse Glimmer local/edge runtime, license, hardware and quality.
- AI018 [P3] Evaluate Muse Spark Open GPU/inference cost and deployment.
- AI019 [P2] Self-hosted compatible inference adapter after evaluation.
- AI020 [P2] Document Muse Code use with approvals/sandbox; not runtime dependency.

## Security and release
- BE037 [P0] Audit events for sensitive actions and sharing.
- BE038 [P0] Secrets, CORS, rate limits and secure media.
- BE039 [P1] Notifications abstraction/retries.
- BE040 [P1] Backup/restore, deployment and runbooks.
- BE041 [P0] Acceptance tests: receiving <1 min/item, stock match, purchase math, tenant separation, scoped access.
- BE042 [P0] Rwanda data protection legal review; no unsupported compliance claim.
