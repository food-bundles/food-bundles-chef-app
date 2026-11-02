# Phase 09 — Meta AI Integration and Governance

## Verify
Read current official docs, model availability, API schemas, rate limits, pricing, region support, terms and data handling. Current documented IDs: Muse Wonder `muse-wonder-1.0`; Muse Spark Standard `muse-spark-1.3`, `1.2`, `1.1` (Contributor variants separate); Muse Image `muse-image-1.0`; Muse Voice Transcribe `muse-voice-transcribe-1.0`; SAM `sam-3.1`. Meta Model API base URL `https://api.meta.ai/v1`, bearer `MODEL_API_KEY`. Re-verify at implementation time.

## Architecture
Add provider-neutral capabilities/registry/routing under `app/modules/ai/`; hosted Meta transport under `app/integrations/meta_model_api/`; self-hosted transport under `app/integrations/self_hosted_models/`. Typed DTOs, Pydantic validation, prompt/model versions, usage metadata, request IDs, timeouts, bounded retries, rate limits, feature flags off by default and mocked contract tests.

## Hosted models
- Muse Spark: structured extraction/multimodal kitchen assistance.
- Muse Wonder: complex reasoning only when cost/latency justified.
- SAM 3.1: segmentation of visible crate/product regions; not food quality judgement.
- Muse Voice Transcribe: chef dictation; speech-to-text only.
- Muse Image: optional menu/marketing assets; never delivery evidence.

## Open weights and coding agent
- Muse Glimmer: evaluate local/edge hardware, runtime, license, privacy, latency and quality.
- Muse Spark Open: evaluate GPU/inference requirements and total cost before provisioning.
- These are not ordinary Meta Model API hosted calls; use documented self-hosted or separately evaluated hosted inference.
- Muse Code is a developer coding agent, not production service; human review and test gates remain mandatory.

## Safety
AI advisory only; deterministic domain services own stock/cost/purchase calculations. Manual receiving remains available if AI off/down. Validate output; retry schema correction at most once. Default timeout 20s unless justified. Target images <1MB; validate MIME/dimensions. No raw media/prompt logs by default. Do not send unrelated supplier data to Meta. Prefer Standard mode for sensitive content; Contributor requires explicit data-use approval. No AI action mutates stock, accepts deliveries, places orders or pays without chef confirmation and deterministic validation. Human-reviewed evaluation must measure accuracy, false positives, latency, failures and cost.

**Exit:** approved data/model decisions, evaluated routing, cost/quality thresholds, safe fallback and explicit feature enablement.
