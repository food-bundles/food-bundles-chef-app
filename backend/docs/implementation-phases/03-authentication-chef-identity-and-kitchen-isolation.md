# Phase 03 — Authentication and Kitchen Isolation

Implement phone OTP with hash, expiry, one-time use, throttling and provider abstraction. Add access/refresh rotation and revocation, chef profile, multiple kitchens, membership/ownership, active kitchen and archive. Enforce kitchen authorization in every service; add PostgreSQL RLS defense-in-depth. Implement restaurant linking only after scope/workflow decision. Audit sensitive actions.

**Exit:** cross-chef/kitchen tests prove isolation; OTP/secrets never logged.
