"""Router failover rules (Phase 8, step 1). Fake providers — no network, no SDK calls.

Every failover scenario must be served by Meta with the right fallback_reason logged;
400 and refusals must not fail over; the pure-Meta path keeps pre-Phase-8 errors.
"""

from __future__ import annotations

import asyncio
import json
import time
from collections.abc import Callable
from typing import Any

import pytest
from app.core import config as cfg
from app.core.exceptions import (
    AiBadOutputError,
    AiBudgetExceededError,
    AiPrimaryFailedError,
    AiProviderError,
    AiRefusedError,
    AiTimeoutError,
    AiUnavailableError,
)
from app.modules.ai.providers import health
from app.modules.ai.providers.base import (
    LLMRequest,
    LLMResult,
    Message,
    ProviderAuth,
    ProviderBadRequest,
    ProviderNetwork,
    ProviderOverloaded,
    ProviderRateLimited,
    ProviderRefusal,
    ProviderTimeout,
    ProviderUnexpected,
    Usage,
)
from app.modules.ai.providers.router import ProviderRouter
from app.modules.ai.providers.spend import BudgetDecision
from pydantic import BaseModel
from structlog.testing import capture_logs

pytestmark = pytest.mark.asyncio


class Answer(BaseModel):
    label: str


GOOD = json.dumps({"label": "menu"})
Step = str | Exception | Callable[[LLMRequest], str] | float  # float: hang that long


class FakeProvider:
    def __init__(self, name: str, steps: list[Step], configured: bool = True) -> None:
        self.name = name
        self.steps = list(steps)
        self.configured = configured
        self.calls: list[LLMRequest] = []
        self.timeouts: list[float] = []

    def is_configured(self) -> bool:
        return self.configured

    async def generate(self, request: LLMRequest, timeout_seconds: float) -> LLMResult:
        self.calls.append(request)
        self.timeouts.append(timeout_seconds)
        step = self.steps.pop(0) if self.steps else GOOD
        if isinstance(step, Exception):
            raise step
        if isinstance(step, float):
            await asyncio.sleep(step)  # ignores timeout_seconds, like a stuck connection
            step = GOOD
        text = step(request) if callable(step) else step
        return LLMResult(
            text=text,
            provider=self.name,
            model=f"{self.name}-model",
            latency_ms=5,
            finish_reason="stop",
            usage=Usage(input_tokens=10, output_tokens=5),
        )


class FakeSpend:
    def __init__(self, action: str = "ok") -> None:
        self.action = action
        self.recorded: list[dict[str, Any]] = []

    async def check(self, kitchen_id: str) -> BudgetDecision:
        return BudgetDecision(action=self.action)  # type: ignore[arg-type]

    async def record(self, **kwargs: Any) -> None:
        self.recorded.append(kwargs)


class FakeKill:
    def __init__(self, on: set[str] | None = None) -> None:
        self.on = on or set()

    async def is_on(self, provider: str) -> bool:
        return provider in self.on


@pytest.fixture(autouse=True)
def _settings(monkeypatch: pytest.MonkeyPatch) -> None:
    s = cfg.settings
    monkeypatch.setattr(s, "AI_PRIMARY_PROVIDER", "anthropic")
    monkeypatch.setattr(s, "AI_FALLBACK_PROVIDER", "meta")
    monkeypatch.setattr(s, "ANTHROPIC_ENABLED", True)
    monkeypatch.setattr(s, "AI_ROUTER_MAX_RETRIES", 2)
    monkeypatch.setattr(s, "AI_BREAKER_FAILURE_THRESHOLD", 3)
    monkeypatch.setattr(s, "AI_BREAKER_COOLDOWN_MS", 30_000)
    monkeypatch.setattr(s, "AI_PRIMARY_BUDGET_SHARE", 0.6)
    health.reset()


def _request() -> LLMRequest:
    return LLMRequest(
        feature="image_classify",
        prompt_version="classify_image.v1",
        systems={"meta": "meta system"},
        messages=[Message.text("user", "Classify this photo.")],
        request_id="req-1",
        kitchen_id="kitchen-1",
        output_schema=Answer.model_json_schema(),
    )


def _parse(raw: str) -> Answer:
    return Answer.model_validate_json(raw)


def _router(
    anthropic: FakeProvider,
    meta: FakeProvider,
    *,
    spend: FakeSpend | None = None,
    kill: FakeKill | None = None,
    sleeps: list[float] | None = None,
) -> ProviderRouter:
    async def fake_sleep(seconds: float) -> None:
        if sleeps is not None:
            sleeps.append(seconds)

    return ProviderRouter(
        {"anthropic": anthropic, "meta": meta},
        spend=spend or FakeSpend(),  # type: ignore[arg-type]
        kill=kill or FakeKill(),  # type: ignore[arg-type]
        sleep=fake_sleep,
    )


async def _run(router: ProviderRouter, budget: float = 10.0, policy: str = "default"):
    with capture_logs() as logs:
        try:
            routed = await router.run(
                _request(),
                parse=_parse,
                budget_seconds=budget,
                policy=policy,  # type: ignore[arg-type]
            )
        except Exception as exc:
            return exc, [e for e in logs if e["event"] == "ai_call"]
    return routed, [e for e in logs if e["event"] == "ai_call"]


# ── happy path ────────────────────────────────────────────────────────────────


async def test_primary_serves_when_healthy() -> None:
    anthropic, meta = FakeProvider("anthropic", [GOOD]), FakeProvider("meta", [])
    routed, logs = await _run(_router(anthropic, meta))
    assert routed.provider == "anthropic"
    assert routed.value == Answer(label="menu")
    assert meta.calls == []
    assert logs[0]["provider_served"] == "anthropic"
    assert logs[0]["outcome"] == "success"
    assert logs[0]["fallback_reason"] is None


# ── skip the primary without calling it ───────────────────────────────────────


@pytest.mark.parametrize(
    ("setup", "reason"),
    [
        ("no_key", "no_key"),
        ("disabled", "disabled"),
        ("kill_switch", "kill_switch"),
        ("budget", "budget"),
    ],
)
async def test_primary_skipped_serves_from_meta(
    setup: str, reason: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    anthropic = FakeProvider("anthropic", [GOOD], configured=setup != "no_key")
    meta = FakeProvider("meta", [GOOD])
    if setup == "disabled":
        monkeypatch.setattr(cfg.settings, "ANTHROPIC_ENABLED", False)
    router = _router(
        anthropic,
        meta,
        kill=FakeKill({"anthropic"}) if setup == "kill_switch" else None,
        spend=FakeSpend("fallback") if setup == "budget" else None,
    )
    routed, logs = await _run(router)
    assert routed.provider == "meta"
    assert anthropic.calls == []
    assert logs[0]["skip_reason"] == reason
    assert logs[0]["fallback_reason"] is None
    assert logs[0]["provider_served"] == "meta"
    assert logs[0]["outcome"] == "primary_skipped"
    assert routed.fallback_reason is None


async def test_breaker_opens_then_skips_primary() -> None:
    anthropic = FakeProvider("anthropic", [ProviderTimeout()] * 3)
    meta = FakeProvider("meta", [GOOD] * 4)
    router = _router(anthropic, meta)
    for _ in range(3):
        await _run(router)
    assert router.breaker("anthropic").state == "open"
    calls_before = len(anthropic.calls)
    routed, logs = await _run(router)
    assert routed.provider == "meta"
    assert len(anthropic.calls) == calls_before  # not called while open
    assert logs[0]["skip_reason"] == "breaker_open"
    assert logs[0]["outcome"] == "primary_skipped"
    assert logs[0]["fallback_reason"] is None


async def test_breaker_half_open_probe_closes_on_success() -> None:
    now = [0.0]
    anthropic = FakeProvider("anthropic", [ProviderTimeout()] * 3 + [GOOD])
    meta = FakeProvider("meta", [GOOD] * 4)
    router = _router(anthropic, meta)
    router._clock = lambda: now[0]
    for _ in range(3):
        await _run(router)
    now[0] += 31.0  # past the cooldown
    assert router.breaker("anthropic").state == "half_open"
    routed, _ = await _run(router)
    assert routed.provider == "anthropic"
    assert router.breaker("anthropic").state == "closed"


# ── fail over after calling the primary ───────────────────────────────────────


@pytest.mark.parametrize(
    ("error", "reason", "expected_calls"),
    [
        (ProviderTimeout(), "timeout", 1),
        (ProviderNetwork(), "network", 3),  # retried twice, then failover
        (ProviderOverloaded(status_code=529), "overloaded", 3),
        (ProviderOverloaded(status_code=500), "overloaded", 3),
        (ProviderRateLimited(retry_after=0.1), "rate_limited", 3),
        (ProviderUnexpected(), "unexpected", 1),
    ],
)
async def test_failover_reasons(error: Exception, reason: str, expected_calls: int) -> None:
    anthropic = FakeProvider("anthropic", [error] * 3)
    meta = FakeProvider("meta", [GOOD])
    routed, logs = await _run(_router(anthropic, meta))
    assert routed.provider == "meta"
    assert len(anthropic.calls) == expected_calls
    assert logs[0]["fallback_reason"] == reason
    assert logs[0]["outcome"] == "fallback"
    assert logs[0]["skip_reason"] is None
    assert logs[0]["provider_attempted"] == "anthropic,meta"


async def test_router_enforces_total_budget_when_provider_ignores_its_timeout() -> None:
    anthropic = FakeProvider("anthropic", [5.0])  # hangs well past its share
    meta = FakeProvider("meta", [GOOD])
    started = time.monotonic()
    routed, logs = await _run(_router(anthropic, meta), budget=1.0)
    assert time.monotonic() - started < 1.6
    assert routed.provider == "meta"
    assert logs[0]["fallback_reason"] == "timeout"


async def test_pure_meta_hang_raises_timeout_within_budget(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cfg.settings, "ANTHROPIC_ENABLED", False)
    anthropic, meta = FakeProvider("anthropic", []), FakeProvider("meta", [5.0])
    started = time.monotonic()
    error, _ = await _run(_router(anthropic, meta), budget=1.0)
    assert isinstance(error, AiTimeoutError)
    assert time.monotonic() - started < 1.6


async def test_429_honours_retry_after_then_succeeds() -> None:
    sleeps: list[float] = []
    anthropic = FakeProvider("anthropic", [ProviderRateLimited(retry_after=1.5), GOOD])
    meta = FakeProvider("meta", [])
    routed, _ = await _run(_router(anthropic, meta, sleeps=sleeps), budget=20.0)
    assert routed.provider == "anthropic"
    assert sleeps == [1.5]
    assert meta.calls == []


async def test_retry_after_longer_than_budget_fails_over_without_waiting() -> None:
    sleeps: list[float] = []
    anthropic = FakeProvider("anthropic", [ProviderRateLimited(retry_after=60)])
    meta = FakeProvider("meta", [GOOD])
    routed, logs = await _run(_router(anthropic, meta, sleeps=sleeps))
    assert routed.provider == "meta"
    assert sleeps == []
    assert logs[0]["fallback_reason"] == "rate_limited"


async def test_auth_error_falls_back_and_flags_primary_misconfigured() -> None:
    anthropic = FakeProvider("anthropic", [ProviderAuth(status_code=401)])
    meta = FakeProvider("meta", [GOOD])
    routed, logs = await _run(_router(anthropic, meta))
    assert routed.provider == "meta"
    assert logs[0]["fallback_reason"] == "auth"
    assert health.stats("anthropic").misconfigured == "auth"


async def test_malformed_output_repaired_once_then_fails_over() -> None:
    anthropic = FakeProvider("anthropic", ["not json", '{"wrong": 1}'])
    meta = FakeProvider("meta", [GOOD])
    routed, logs = await _run(_router(anthropic, meta))
    assert routed.provider == "meta"
    assert len(anthropic.calls) == 2  # original + exactly one repair
    repair = anthropic.calls[1].messages
    assert repair[-2].role == "assistant"
    assert "not json" in repair[-2].parts[0]
    assert logs[0]["fallback_reason"] == "schema_fail"


async def test_repair_that_succeeds_stays_on_primary() -> None:
    anthropic = FakeProvider("anthropic", ["oops", GOOD])
    meta = FakeProvider("meta", [])
    routed, logs = await _run(_router(anthropic, meta))
    assert routed.provider == "anthropic"
    assert routed.repaired
    assert logs[0]["outcome"] == "repaired"


async def test_primary_leaves_time_for_fallback() -> None:
    anthropic = FakeProvider("anthropic", [ProviderTimeout()])
    meta = FakeProvider("meta", [GOOD])
    await _run(_router(anthropic, meta), budget=10.0)
    assert anthropic.timeouts[0] <= 6.01  # 60 % of the budget
    assert meta.timeouts[0] >= 3.9  # the rest goes to the fallback


async def test_both_down_raises_typed_unavailable() -> None:
    anthropic = FakeProvider("anthropic", [ProviderOverloaded(status_code=529)] * 3)
    meta = FakeProvider("meta", [ProviderOverloaded(status_code=503)] * 3)
    exc, logs = await _run(_router(anthropic, meta))
    assert isinstance(exc, AiUnavailableError)
    assert logs[-1]["outcome"] == "both_failed"


async def test_nothing_configured_raises_unavailable() -> None:
    anthropic = FakeProvider("anthropic", [], configured=False)
    meta = FakeProvider("meta", [], configured=False)
    exc, _ = await _run(_router(anthropic, meta))
    assert isinstance(exc, AiUnavailableError)


# ── never fail over ───────────────────────────────────────────────────────────


async def test_refusal_does_not_fall_back() -> None:
    anthropic = FakeProvider("anthropic", [ProviderRefusal()])
    meta = FakeProvider("meta", [GOOD])
    exc, logs = await _run(_router(anthropic, meta))
    assert isinstance(exc, AiRefusedError)
    assert meta.calls == []
    assert logs[-1]["outcome"] == "refused"


async def test_bad_request_does_not_fall_back_and_logs_error() -> None:
    anthropic = FakeProvider("anthropic", [ProviderBadRequest(status_code=400)])
    meta = FakeProvider("meta", [GOOD])
    exc, logs = await _run(_router(anthropic, meta))
    assert isinstance(exc, AiProviderError)
    assert meta.calls == []
    assert logs[-1]["log_level"] == "error"
    assert logs[-1]["outcome"] == "bad_request"


async def test_budget_block_raises_without_calling_providers() -> None:
    anthropic, meta = FakeProvider("anthropic", []), FakeProvider("meta", [])
    exc, _ = await _run(_router(anthropic, meta, spend=FakeSpend("block")))
    assert isinstance(exc, AiBudgetExceededError)
    assert anthropic.calls == []
    assert meta.calls == []


async def test_budget_cheaper_tier_uses_fast_model() -> None:
    anthropic, meta = FakeProvider("anthropic", [GOOD]), FakeProvider("meta", [])
    await _run(_router(anthropic, meta, spend=FakeSpend("cheaper_tier")))
    assert anthropic.calls[0].tier == "fast"


# ── pure Meta path keeps the errors chefs saw before Phase 8 ──────────────────


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (ProviderTimeout(), AiTimeoutError),
        (ProviderOverloaded(status_code=502), AiProviderError),
    ],
)
async def test_meta_only_path_errors_unchanged(error: Exception, expected: type) -> None:
    anthropic = FakeProvider("anthropic", [], configured=False)
    meta = FakeProvider("meta", [error] * 3)
    exc, _ = await _run(_router(anthropic, meta))
    assert isinstance(exc, expected)


async def test_meta_only_schema_failure_is_bad_output() -> None:
    anthropic = FakeProvider("anthropic", [], configured=False)
    meta = FakeProvider("meta", ["nope", "still nope"])
    exc, _ = await _run(_router(anthropic, meta))
    assert isinstance(exc, AiBadOutputError)


async def test_meta_only_policy_never_calls_anthropic() -> None:
    anthropic, meta = FakeProvider("anthropic", [GOOD]), FakeProvider("meta", [GOOD])
    routed = await _router(anthropic, meta).run(
        _request(), parse=_parse, budget_seconds=5, policy="meta_only"
    )
    assert routed.provider == "meta"
    assert anthropic.calls == []


# ── spend accounting ──────────────────────────────────────────────────────────


async def test_spend_recorded_for_every_billed_attempt() -> None:
    spend = FakeSpend()
    anthropic = FakeProvider("anthropic", ["bad", "bad"])  # billed, then failover
    meta = FakeProvider("meta", [GOOD])
    await _run(_router(anthropic, meta, spend=spend))
    providers = [r["provider"] for r in spend.recorded]
    assert providers == ["anthropic", "meta"]
    assert spend.recorded[0]["usage"].input_tokens == 20  # both anthropic calls


async def test_failover_never_duplicates_a_proposal() -> None:
    """The router returns ONE proposal; failover discards the failed attempt's output.

    Writes happen only later, after the chef confirms, through idempotent APIs.
    """
    proposal = json.dumps({"label": "record_sale"})
    anthropic = FakeProvider("anthropic", [ProviderTimeout()])
    meta = FakeProvider("meta", [proposal])
    routed, logs = await _run(_router(anthropic, meta))
    assert routed.value == Answer(label="record_sale")
    assert len(meta.calls) == 1
    assert len(logs) == 1


# ── no_failover policy (classify) ─────────────────────────────────────────────


@pytest.mark.parametrize(
    "error",
    [ProviderTimeout(), ProviderNetwork(), ProviderOverloaded(status_code=529), ProviderAuth()],
)
async def test_no_failover_primary_failure_never_calls_meta(error: Exception) -> None:
    anthropic = FakeProvider("anthropic", [error] * 3)
    meta = FakeProvider("meta", [GOOD])
    result, logs = await _run(_router(anthropic, meta), policy="no_failover")
    assert isinstance(result, AiPrimaryFailedError)
    assert meta.calls == []
    assert logs[0]["provider_attempted"] == "anthropic"
    assert logs[0]["provider_served"] is None
    assert logs[0]["fallback_reason"] is None
    assert logs[0]["policy"] == "no_failover"


async def test_no_failover_schema_fail_after_repair_raises_primary_failed() -> None:
    anthropic = FakeProvider("anthropic", ["not json", "still not json"])
    meta = FakeProvider("meta", [GOOD])
    result, logs = await _run(_router(anthropic, meta), policy="no_failover")
    assert isinstance(result, AiPrimaryFailedError)
    assert meta.calls == []
    assert logs[0]["outcome"] == "schema_fail"


async def test_no_failover_bad_request_raises_primary_failed_and_logs_error() -> None:
    anthropic = FakeProvider("anthropic", [ProviderBadRequest()])
    meta = FakeProvider("meta", [GOOD])
    result, logs = await _run(_router(anthropic, meta), policy="no_failover")
    assert isinstance(result, AiPrimaryFailedError)
    assert meta.calls == []
    assert logs[0]["log_level"] == "error"


async def test_no_failover_refusal_stays_a_refusal() -> None:
    anthropic = FakeProvider("anthropic", [ProviderRefusal()])
    meta = FakeProvider("meta", [GOOD])
    result, _ = await _run(_router(anthropic, meta), policy="no_failover")
    assert isinstance(result, AiRefusedError)
    assert meta.calls == []


async def test_no_failover_primary_gets_the_whole_budget() -> None:
    anthropic = FakeProvider("anthropic", [GOOD])
    meta = FakeProvider("meta", [])
    routed, logs = await _run(_router(anthropic, meta), budget=10.0, policy="no_failover")
    assert routed.provider == "anthropic"
    assert anthropic.timeouts[0] > 9.0  # not the 60 % primary share
    assert logs[0]["outcome"] == "success"


async def test_no_failover_skipped_primary_still_served_by_meta() -> None:
    anthropic = FakeProvider("anthropic", [GOOD], configured=False)
    meta = FakeProvider("meta", [GOOD])
    routed, logs = await _run(_router(anthropic, meta), policy="no_failover")
    assert routed.provider == "meta"
    assert logs[0]["outcome"] == "primary_skipped"
    assert logs[0]["skip_reason"] == "no_key"
