# Phase 02 — Architecture, Database and Migrations

Establish `core`, `api/v1`, `shared`, `modules` and `integrations`. Define SQLAlchemy session/transaction lifecycle, Alembic, UUID/ID, UTC, Decimal, units, pagination and audit conventions. Create initial chef/kitchen/membership schema only after mobile audit. Add constraints/indexes based on access patterns and migration tests.

**Exit:** migrations reproducible; routers contain no domain logic.
