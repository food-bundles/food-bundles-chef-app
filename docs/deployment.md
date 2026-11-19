# Deployment

The backend runs as four services plus two one-shot steps, defined in
[`backend/docker-compose.prod.yml`](../backend/docker-compose.prod.yml). The file holds no
values: every setting is passed **by name** from the host's environment or an `--env-file`
kept outside the repository (or injected by a secret manager).

| Service | What it does | Health check |
|---|---|---|
| `db` | PostgreSQL 16. No published port. | `pg_isready` |
| `redis` | arq queue and scheduler, AI kill switch, rate limits. `maxmemory-policy volatile-lru` (the kill switch has no TTL, so it is never evicted), AOF on, password required. No published port. | `redis-cli ping` |
| `migrate` (one-shot) | `alembic upgrade head`, before the api and worker start. | exit code 0 |
| `api` | FastAPI behind a TLS reverse proxy; bound to `127.0.0.1:8000` by default. | `GET /health/ready` (app answers and reaches the database) |
| `worker` | arq: exchange rates (at startup, 01:15 and 13:15 UTC), low-stock reminders (hourly, 07:00 kitchen time), catalogue refresh (hourly), order sync and push jobs. | `arq … --check` reads the heartbeat the worker writes every 60 s |
| `worker-check` (one-shot) | **Startup check that the worker is alive:** waits up to 10 minutes for a successful rates fetch less than 24 h old (`python -m app.workers.check_worker`). | exit code 0 |

Only one `worker` replica runs: arq's cron jobs are not deduplicated across workers.

## Deploy

```sh
cd backend
docker build --target runtime -t "$APP_IMAGE" .
docker compose -f docker-compose.prod.yml --env-file /path/outside/repo/prod.env up -d
# The deploy fails if the worker is not alive:
docker compose -f docker-compose.prod.yml wait worker-check   # exit code of the check
```

`-f docker-compose.prod.yml` alone means the git-ignored dev `docker-compose.override.yml` is
never applied. After the deploy, `GET /api/v1/ai/rates-health` (header `X-Ops-Token`) shows
each source's last successful fetch, the age of each currency's rate and any missing
currency; `GET /api/v1/ai/health` shows the AI providers.

Rollback: redeploy the previous `APP_IMAGE`. Migrations are reversible
(`alembic downgrade -1`), but run a downgrade only after checking the target database name.

## Environment (names only)

Required by the compose file itself (it refuses to start without them): `APP_IMAGE`,
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `REDIS_PASSWORD`. Optional:
`API_BIND`, `API_PORT`, `API_WORKERS`, `REDIS_MAXMEMORY`.

Application settings (documented with defaults in `backend/.env.example`; secrets marked
**S**, which belong in the secret manager):

- **Core:** `APP_ENV` (`production`), `APP_NAME`, `DEBUG` (`false`), `SECRET_KEY` **S**,
  `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `DATABASE_URL` **S** and
  `DATABASE_URL_SYNC` **S** (host `db`), `REDIS_URL` **S** (host `redis`, with the password),
  `CORS_ORIGINS`.
- **OTP / SMS:** `OTP_PROVIDER`, `OTP_EXPIRY_SECONDS`, `OTP_MAX_ATTEMPTS`,
  `OTP_RESEND_COOLDOWN_SECONDS`, `SMS_API_KEY` **S**, `SMS_SENDER_ID`.
- **AI (Meta fallback):** `META_MODEL_API_BASE_URL`, `MODEL_API_KEY` **S**,
  `META_MUSE_SPARK_MODEL`, `META_MUSE_SPARK_FAST_MODEL`, `META_MUSE_WONDER_MODEL`,
  `META_MUSE_IMAGE_MODEL`, `META_MUSE_VOICE_MODEL`, `META_SAM_MODEL`.
- **AI (features, limits):** `AI_ENABLED`, `AI_AGENT_ENABLED`, `AI_*_ENABLED`,
  `AI_DEFAULT_TIMEOUT_SECONDS`, `AI_MAX_RETRIES`, `AI_MAX_IMAGE_SIZE_BYTES`, `AI_LOG_CONTENT`
  (`false`), `AI_TRANSCRIPTION_LANGUAGES`, `AI_CHAT_TIMEOUT_SECONDS`,
  `AI_TARGET_FOOD_COST_LOW/HIGH`, `AI_MAX_REQUESTS_PER_KITCHEN_PER_DAY`,
  `AI_MAX_REQUESTS_PER_CHEF_PER_DAY`.
- **AI (Anthropic primary, router):** `AI_PRIMARY_PROVIDER`, `AI_FALLBACK_PROVIDER`,
  `ANTHROPIC_API_KEY` **S**, `ANTHROPIC_ENABLED`, `ANTHROPIC_MODEL_FAST/STANDARD/ADVANCED`,
  `ANTHROPIC_EFFORT_*`, `AI_MODEL_CAPABILITIES`, `AI_MODEL_PRICES`, `AI_TIMEOUT_*_MS`,
  `AI_PRIMARY_BUDGET_SHARE`, `AI_ROUTER_MAX_RETRIES`, `AI_BREAKER_*`,
  `AI_DAILY_BUDGET_USD`, `AI_KITCHEN_DAILY_BUDGET_USD`, `AI_BUDGET_EXCEEDED_ACTION`,
  `AI_OPS_TOKEN` **S**.
- **Catalogue:** `FOOD_BUNDLES_CATALOG_PROVIDER`, `FOOD_BUNDLES_COUNTRIES`,
  `FOOD_BUNDLES_CATALOG_CURRENCY`, `FOOD_BUNDLES_API_URL`, `FOOD_BUNDLES_API_KEY` **S**.
- **Money and rates:** `PRICE_ROUNDING_STEPS`, `EXCHANGE_RATE_API_KEY` **S** (empty until the
  licence question is answered; Frankfurter serves alone), `EXCHANGE_RATE_API_URL`,
  `FRANKFURTER_API_URL`, `EXCHANGE_RATE_TIMEOUT_SECONDS`, `RATE_STALE_DAYS`,
  `CURRENCY_CONVERSION_ENABLED_COUNTRIES` (`["RW"]` until a licensed source is confirmed,
  see [exchange-rate-licences.md](design/exchange-rate-licences.md)),
  `LOW_STOCK_REMINDER_LOCAL_HOUR`.
- **Storage and push:** `OBJECT_STORAGE_PROVIDER`, `OBJECT_STORAGE_BUCKET`,
  `OBJECT_STORAGE_ACCESS_KEY` **S**, `OBJECT_STORAGE_SECRET_KEY` **S**,
  `OBJECT_STORAGE_ENDPOINT_URL`, `LOCAL_STORAGE_PATH`, `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY` **S**, `CLOUDINARY_API_SECRET` **S**, `PUSH_NOTIFICATIONS_PROVIDER`,
  `EXPO_ACCESS_TOKEN` **S**.

## Proposed changes (not made)

- The `Dockerfile` builder installs `.[dev]`, so the runtime image carries test and lint
  tools. Proposal: install `.` only for the runtime stage.
- The base `docker-compose.yml` (local use) has default database credentials and publishes
  Postgres and Redis ports; it must never be used for production. The prod file does neither.

## What I can't determine about the current hosting

Please find out:

1. **Where the backend runs today** (VM, Render/Railway/Fly, Kubernetes, a managed container
   service?) and whether it uses Docker at all. There is no deployment manifest in the repo.
2. **Whether a worker process runs in production at all.** If only the api runs, the rates
   job, low-stock reminders, catalogue refresh and order sync never run.
3. **Managed or self-hosted Postgres and Redis?** If managed, drop `db` / `redis` from the
   compose file and point `DATABASE_URL` / `REDIS_URL` at them; for Redis, confirm the
   `maxmemory-policy` can be set to `volatile-lru` and that persistence is on.
4. **How secrets are stored** (platform env vars, a secret manager, a file on the host) and
   who can read them.
5. **TLS and the reverse proxy** (nginx, Caddy, a load balancer) and the public API hostname
   the app builds use.
6. **Where uploaded files go** in production (`OBJECT_STORAGE_PROVIDER`: local volume,
   S3, GCS or Cloudinary) and the retention policy.
7. **Backups:** Postgres backup schedule, retention and the last restore test.
8. **Logs and alerts:** where container logs go, and who receives the alerts in
   `docs/ai-providers.md` (fallback rate, primary auth errors, budget at 80 %).
9. **Deploy process:** who deploys, from which branch, and whether CI builds the image.
10. **Server time zone and clock sync** (the scheduler uses UTC; kitchens use their own zones).
