# Phase 00 — Git Safety, Mobile Audit and Decisions

Read-only first. Inspect status, current branch, branches, remotes and recent history. Confirm source `feat/project-startup-mobile` exists, tree is clean including untracked files, and target `feat/backend-project-startup` is absent. Inspect mobile types, Zod schemas, SQLite migrations, repositories, Zustand stores, mutation queue, mocks, API abstractions and tests. Produce a mobile operation/entity/payload/response/persistence/idempotency/retry/conflict/auth matrix. Record open questions: OTP provider, restaurant approval workflow placement, checkout, media storage, AI consent/data terms and sync conflicts. Present report and wait for approval.

After approval only:
```powershell
git switch feat/project-startup-mobile
git switch -c feat/backend-project-startup
```
Stop on dirty tree, missing source, existing target or unexpected history. Never stash/reset/delete/force-push autonomously.

**Exit:** reviewed audit, approved branch creation, mobile preserved.
