"""Deployment check: is the arq worker alive? (docs/deployment.md)

Passes when the exchange-rates job, which the worker runs at startup and at 01:15 / 13:15 UTC,
has fetched successfully within --max-age-hours (default 24). Waits up to --wait-seconds for
the first fetch after a fresh start. Exit 0 = alive, 1 = not alive. Prints no secrets.

    python -m app.workers.check_worker --wait-seconds 600
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import UTC, datetime

from app.core.database import AsyncSessionFactory
from app.modules.exchange_rates.health import last_fetch_at, rates_health, worker_is_alive


async def _check(max_age_hours: float) -> tuple[bool, datetime | None]:
    async with AsyncSessionFactory() as db:
        report = await rates_health(db)
    return worker_is_alive(report, datetime.now(UTC), max_age_hours), last_fetch_at(report)


async def main(wait_seconds: int, max_age_hours: float, interval: int = 15) -> int:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + wait_seconds
    while True:
        alive, last = await _check(max_age_hours)
        if alive:
            print(f"worker alive: last rates fetch {last.isoformat() if last else '-'}")
            return 0
        if loop.time() >= deadline:
            seen = last.isoformat() if last else "never"
            print(
                f"worker NOT alive: last rates fetch {seen} (limit {max_age_hours} h). "
                "Check the worker container logs and REDIS_URL.",
                file=sys.stderr,
            )
            return 1
        await asyncio.sleep(interval)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wait-seconds", type=int, default=0)
    parser.add_argument("--max-age-hours", type=float, default=24)
    args = parser.parse_args()
    sys.exit(asyncio.run(main(args.wait_seconds, args.max_age_hours)))
