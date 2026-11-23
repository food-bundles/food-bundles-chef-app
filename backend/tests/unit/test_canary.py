"""Phase 8 Step 3: the Anthropic canary (percent of kitchens, features, countries)."""

from __future__ import annotations

from typing import Any

import pytest
from app.core import config as cfg
from app.modules.ai.providers.base import LLMRequest, LLMResult, Message, Usage
from app.modules.ai.providers.canary import Canary, kitchen_bucket
from app.modules.ai.providers.router import ProviderRouter
from app.modules.ai.providers.spend import BudgetDecision
from pydantic import BaseModel
from structlog.testing import capture_logs

pytestmark = pytest.mark.asyncio


class Answer(BaseModel):
    label: str


class Provider:
    def __init__(self, name: str) -> None:
        self.name = name
        self.calls = 0

    def is_configured(self) -> bool:
        return True

    async def generate(self, request: LLMRequest, timeout_seconds: float) -> LLMResult:
        self.calls += 1
        return LLMResult(
            text='{"label": "menu"}',
            provider=self.name,
            model=f"{self.name}-model",
            latency_ms=5,
            finish_reason="stop",
            usage=Usage(input_tokens=10, output_tokens=5),
        )


class Spend:
    async def check(self, kitchen_id: str) -> BudgetDecision:
        return BudgetDecision(action="ok")

    async def record(self, **kwargs: Any) -> None:
        return None


class Kill:
    async def is_on(self, provider: str) -> bool:
        return False


@pytest.fixture(autouse=True)
def _settings(monkeypatch: pytest.MonkeyPatch) -> None:
    s = cfg.settings
    monkeypatch.setattr(s, "AI_PRIMARY_PROVIDER", "anthropic")
    monkeypatch.setattr(s, "AI_FALLBACK_PROVIDER", "meta")
    monkeypatch.setattr(s, "ANTHROPIC_ENABLED", True)
    monkeypatch.setattr(s, "AI_ANTHROPIC_CANARY_PERCENT", 100)
    monkeypatch.setattr(s, "AI_ANTHROPIC_CANARY_FEATURES", [])
    monkeypatch.setattr(s, "AI_ANTHROPIC_CANARY_COUNTRIES", [])


def _countries(table: dict[str, str]):
    async def lookup(kitchen_id: str) -> str | None:
        return table.get(kitchen_id)

    return lookup


def _kitchen_in_bucket(below: int) -> str:
    """A kitchen id whose bucket is below `below` (found deterministically)."""
    for i in range(10_000):
        kid = f"kitchen-{i}"
        if kitchen_bucket(kid) < below:
            return kid
    raise AssertionError("no kitchen found")


def _kitchen_outside_bucket(at_least: int) -> str:
    for i in range(10_000):
        kid = f"kitchen-{i}"
        if kitchen_bucket(kid) >= at_least:
            return kid
    raise AssertionError("no kitchen found")


async def test_defaults_keep_every_kitchen_and_feature_on_anthropic() -> None:
    gate = Canary(_countries({}))
    assert await gate.includes("any-kitchen", "assistant")


async def test_bucket_is_stable_and_in_range() -> None:
    assert kitchen_bucket("k-1") == kitchen_bucket("k-1")
    assert all(0 <= kitchen_bucket(f"k-{i}") < 100 for i in range(500))


async def test_kitchens_in_the_10_percent_stage_stay_in_at_50(monkeypatch: pytest.MonkeyPatch) -> None:
    gate = Canary(_countries({}))
    early = _kitchen_in_bucket(10)
    monkeypatch.setattr(cfg.settings, "AI_ANTHROPIC_CANARY_PERCENT", 10)
    assert await gate.includes(early, "menu_scan")
    monkeypatch.setattr(cfg.settings, "AI_ANTHROPIC_CANARY_PERCENT", 50)
    assert await gate.includes(early, "menu_scan")


async def test_zero_percent_is_the_rollback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cfg.settings, "AI_ANTHROPIC_CANARY_PERCENT", 0)
    gate = Canary(_countries({}))
    assert not await gate.includes(_kitchen_in_bucket(1), "menu_scan")


async def test_features_outside_the_list_stay_on_meta(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        cfg.settings,
        "AI_ANTHROPIC_CANARY_FEATURES",
        ["image_classify", "menu_scan", "dish_analysis", "document_scan"],
    )
    gate = Canary(_countries({}))
    assert await gate.includes("k", "menu_scan")
    assert not await gate.includes("k", "assistant")


async def test_only_listed_countries(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cfg.settings, "AI_ANTHROPIC_CANARY_COUNTRIES", ["RW"])
    gate = Canary(_countries({"kigali": "RW", "paris": "FR"}))
    assert await gate.includes("kigali", "menu_scan")
    assert not await gate.includes("paris", "menu_scan")
    assert not await gate.includes("unknown", "menu_scan")


async def test_country_lookup_is_cached(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cfg.settings, "AI_ANTHROPIC_CANARY_COUNTRIES", ["RW"])
    calls: list[str] = []

    async def lookup(kitchen_id: str) -> str | None:
        calls.append(kitchen_id)
        return "RW"

    gate = Canary(lookup, clock=lambda: 1000.0)
    assert await gate.includes("kigali", "menu_scan")
    assert await gate.includes("kigali", "dish_analysis")
    assert calls == ["kigali"]


def _request(kitchen_id: str, feature: str) -> LLMRequest:
    return LLMRequest(
        feature=feature,
        prompt_version="v",
        systems={"meta": "system"},
        messages=[Message.text("user", "hi")],
        request_id="r",
        kitchen_id=kitchen_id,
        output_schema=Answer.model_json_schema(),
    )


async def test_router_sends_kitchens_outside_the_canary_to_meta(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(cfg.settings, "AI_ANTHROPIC_CANARY_PERCENT", 10)
    anthropic, meta = Provider("anthropic"), Provider("meta")
    router = ProviderRouter(
        {"anthropic": anthropic, "meta": meta},  # type: ignore[dict-item]
        spend=Spend(),  # type: ignore[arg-type]
        kill=Kill(),  # type: ignore[arg-type]
        canary_gate=Canary(_countries({})),
    )
    outside = _kitchen_outside_bucket(10)
    with capture_logs() as logs:
        routed = await router.run(
            _request(outside, "menu_scan"),
            parse=Answer.model_validate_json,
            budget_seconds=5,
        )
    assert routed.provider == "meta"
    assert (anthropic.calls, meta.calls) == (0, 1)
    event = next(e for e in logs if e["event"] == "ai_call")
    assert event["skip_reason"] == "canary"

    inside = _kitchen_in_bucket(10)
    routed = await router.run(
        _request(inside, "menu_scan"), parse=Answer.model_validate_json, budget_seconds=5
    )
    assert routed.provider == "anthropic"
