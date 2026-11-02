# Implementation Phases

Execute sequentially. Phase 00 is read-only audit; wait for review before branch changes.

| Phase | Scope | Exit gate |
|---|---|---|
| 00 | Git safety, mobile audit, decisions | Clean branch plan and contract map |
| 01 | Python/FastAPI foundation | Reproducible setup and CI |
| 02 | Modular architecture, DB, migrations | Migration and persistence tests |
| 03 | Chef auth and kitchen isolation | Tenant/security tests |
| 04 | Kitchen domain and deterministic math | Hand-calculation tests |
| 05 | Catalog, purchasing, Food Bundles orders | Contract-tested orders |
| 06 | Delivery receiving and quality | Manual receiving and shortfall tests |
| 07 | Offline sync/mobile integration | Replay/conflict tests |
| 08 | Security, observability, release | Acceptance/operational gates |
| 09 | Meta AI integration/governance | Evaluated adapters, safe fallback |
