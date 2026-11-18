"""ai_spend_daily upsert + budgets, and the ops-token-protected /api/v1/ai endpoints."""

from __future__ import annotations

import asyncio
from decimal import Decimal

import pytest
from app.core import config as cfg
from app.core.security import create_access_token
from app.modules.ai.models import AiSpendDaily
from app.modules.ai.providers.base import Usage
from app.modules.ai.providers.spend import GLOBAL, SpendTracker
from app.modules.chefs.models import Chef
from httpx import AsyncClient
from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

pytestmark = pytest.mark.asyncio


@pytest.fixture
def tracker(test_engine) -> SpendTracker:
    factory = async_sessionmaker(test_engine, expire_on_commit=False, autoflush=False)
    return SpendTracker(session_factory=factory)


async def _rows(test_engine, scope: str) -> list[AiSpendDaily]:
    factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with factory() as session:
        return list(
            (await session.scalars(select(AiSpendDaily).where(AiSpendDaily.scope == scope))).all()
        )


async def test_record_upserts_global_and_kitchen_rows(tracker: SpendTracker, test_engine) -> None:
    kitchen = "kitchen-spend-1"
    usage = Usage(input_tokens=1000, output_tokens=100, cached_tokens=10)
    await asyncio.gather(
        *(
            tracker.record(
                kitchen_id=kitchen, provider="anthropic", model="m1", usage=usage, cost=0.01
            )
            for _ in range(5)
        )
    )
    [row] = await _rows(test_engine, kitchen)
    assert row.requests == 5
    assert row.input_tokens == 5000
    assert row.cached_tokens == 50
    assert row.cost_usd == Decimal("0.050000")
    assert await tracker.total(kitchen) == pytest.approx(0.05)
    global_rows = [r for r in await _rows(test_engine, GLOBAL) if r.model == "m1"]
    assert global_rows[0].requests == 5


async def test_budget_reached_returns_configured_action(
    tracker: SpendTracker, monkeypatch: pytest.MonkeyPatch
) -> None:
    kitchen = "kitchen-spend-2"
    monkeypatch.setattr(cfg.settings, "AI_KITCHEN_DAILY_BUDGET_USD", 0.02)
    monkeypatch.setattr(cfg.settings, "AI_DAILY_BUDGET_USD", 0.0)
    assert (await tracker.check(kitchen)).action == "ok"
    await tracker.record(
        kitchen_id=kitchen, provider="anthropic", model="m2", usage=Usage(1, 1), cost=0.03
    )
    for action in ("fallback", "cheaper_tier", "block"):
        monkeypatch.setattr(cfg.settings, "AI_BUDGET_EXCEEDED_ACTION", action)
        decision = await tracker.check(kitchen)
        assert decision.action == action
        assert decision.scope == kitchen


async def test_budget_cache_is_short_lived(test_engine, monkeypatch: pytest.MonkeyPatch) -> None:
    now = [0.0]
    factory = async_sessionmaker(test_engine, expire_on_commit=False, autoflush=False)
    tracker = SpendTracker(session_factory=factory, clock=lambda: now[0])
    other = SpendTracker(session_factory=factory)  # another API instance
    kitchen = "kitchen-spend-3"
    assert await tracker.total(kitchen) == 0.0
    await other.record(kitchen_id=kitchen, provider="meta", model="m3", usage=Usage(1, 1), cost=1.0)
    assert await tracker.total(kitchen) == 0.0  # cached
    now[0] += 61
    assert await tracker.total(kitchen) == pytest.approx(1.0)  # re-read within 60 s


async def test_spend_failure_never_raises() -> None:
    def broken():
        raise RuntimeError("db down")

    tracker = SpendTracker(session_factory=lambda: broken())
    await tracker.record(kitchen_id="k", provider="meta", model="m", usage=Usage(1, 1), cost=0.1)
    assert await tracker.total("k") == 0.0


# ── ops endpoints ─────────────────────────────────────────────────────────────


async def _chef_headers(db: AsyncSession) -> dict:
    chef = Chef(phone_number="+250781099777", name="Ops Test Chef")
    db.add(chef)
    await db.flush()
    return {"Authorization": f"Bearer {create_access_token(str(chef.id))}"}


async def test_health_requires_ops_token(
    client: AsyncClient, db: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(cfg.settings, "AI_OPS_TOKEN", SecretStr("ops-secret-token"))
    chef = await _chef_headers(db)
    assert (await client.get("/api/v1/ai/health", headers=chef)).status_code == 401
    bad = {**chef, "X-Ops-Token": "wrong"}
    assert (await client.get("/api/v1/ai/health", headers=bad)).status_code == 403


async def test_health_disabled_without_configured_token(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(cfg.settings, "AI_OPS_TOKEN", SecretStr(""))
    resp = await client.get("/api/v1/ai/health", headers={"X-Ops-Token": ""})
    assert resp.status_code == 404


async def test_health_reports_status_without_key_material(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.modules.ai.providers import health, killswitch

    async def off(provider: str) -> bool:
        return False

    monkeypatch.setattr(killswitch.kill_switch, "is_on", off)
    health.reset()
    # Fake key built at runtime so secret scanners don't flag the test source.
    key = "-".join(["sk", "ant", "api03", "SECRETVALUE", "1234567890"])
    monkeypatch.setattr(cfg.settings, "AI_OPS_TOKEN", SecretStr("ops-secret-token"))
    monkeypatch.setattr(cfg.settings, "ANTHROPIC_API_KEY", SecretStr(key))
    monkeypatch.setattr(cfg.settings, "ANTHROPIC_ENABLED", True)
    resp = await client.get("/api/v1/ai/health", headers={"X-Ops-Token": "ops-secret-token"})
    assert resp.status_code == 200
    body = resp.json()
    anthropic = next(p for p in body["providers"] if p["name"] == "anthropic")
    assert anthropic["configured"] is True
    assert anthropic["enabled"] is True
    assert anthropic["breaker_state"] in ("closed", "open", "half_open")
    for fragment in (key, key[:12], "sk-ant", "SECRETVALUE", "ops-secret-token"):
        assert fragment not in resp.text


async def test_health_flags_env_name_typo(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.modules.ai.providers import health, killswitch

    async def off(provider: str) -> bool:
        return False

    monkeypatch.setattr(killswitch.kill_switch, "is_on", off)
    health.reset()
    monkeypatch.setattr(cfg.settings, "AI_OPS_TOKEN", SecretStr("ops-secret-token"))
    monkeypatch.setattr(cfg.settings, "ANTHROPIC_API_KEY", SecretStr(""))
    monkeypatch.setattr(cfg.settings, "AI_PRIMARY_PROVIDER", "anthropic")
    monkeypatch.setenv("ANTROPIC_API_KEY", "typo-value")
    resp = await client.get("/api/v1/ai/health", headers={"X-Ops-Token": "ops-secret-token"})
    anthropic = next(p for p in resp.json()["providers"] if p["name"] == "anthropic")
    assert anthropic["primary_misconfigured"] is True
    assert anthropic["misconfigured_reason"] == "env_name_typo"
    assert anthropic["configured"] is False
    assert "typo-value" not in resp.text


async def test_kill_switch_endpoint(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.modules.ai.providers import killswitch

    calls: list[tuple[str, bool]] = []

    async def record(provider: str, on: bool) -> None:
        calls.append((provider, on))

    monkeypatch.setattr(killswitch.kill_switch, "set", record)
    monkeypatch.setattr(cfg.settings, "AI_OPS_TOKEN", SecretStr("ops-secret-token"))
    resp = await client.put(
        "/api/v1/ai/kill-switch/anthropic",
        json={"on": True},
        headers={"X-Ops-Token": "ops-secret-token"},
    )
    assert resp.status_code == 204
    assert calls == [("anthropic", True)]
