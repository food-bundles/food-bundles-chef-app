# Phase 07 — Offline Sync and Mobile Integration

Implement sync from Phase 00 contract only. Support stable client IDs, idempotency keys, acknowledgements, batch semantics, version/concurrency, conflict responses, retry classification, tombstones and ordering. Test duplicate, delayed, out-of-order and partial batches. Mobile changes require explicit approval.

**Exit:** replay never duplicates orders/receipts/stock movements; conflicts visible.
