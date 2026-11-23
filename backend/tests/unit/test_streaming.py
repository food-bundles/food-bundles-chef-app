"""Step 1b: Assistant streaming. Failover only before the first token; then "interrupted"."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import pytest
from app.core import config as cfg
from app.core.exceptions import AiRefusedError, AiStreamInterruptedError, AiUnavailableError
from app.modules.ai.providers import health
from app.modules.ai.providers.base import (
    LLMRequest,
    LLMResult,
    Message,
    ProviderOverloaded,
    ProviderRefusal,
    StreamChunk,
    Usage,
)
from app.modules.ai.providers.canary import Canary
from app.modules.ai.providers.router import ProviderRouter
from app.modules.ai.providers.spend import BudgetDecision
from app.modules.ai.streaming import ReplyTextExtractor, sse
from pydantic import BaseModel
from structlog.testing import capture_logs

pytestmark = pytest.mark.asyncio

ANSWER = '{"type": "answer", "reply_text": "You have 1.9 kg of chicken."}'


class Turn(BaseModel):
    type: str
    reply_text: str


def _result(name: str, text: str) -> LLMResult:
    return LLMResult(
        text=text,
        provider=name,
        model=f"{name}-model",
        latency_ms=5,
        finish_reason="end_turn",
        usage=Usage(input_tokens=10, output_tokens=5),
    )


class Streamer:
    """A streaming provider: `script` is a list of text pieces or exceptions."""

    def __init__(self, name: str, script: list[Any]) -> None:
        self.name = name
        self.script = script
        self.calls = 0

    def is_configured(self) -> bool:
        return True

    async def generate(self, request: LLMRequest, timeout_seconds: float) -> LLMResult:
        raise AssertionError("streaming providers are streamed")

    async def stream(self, request: LLMRequest, timeout_seconds: float) -> AsyncIterator[StreamChunk]:
        self.calls += 1
        text = ""
        for step in self.script:
            if isinstance(step, Exception):
                raise step
            text += step
            yield StreamChunk(text=step)
        yield StreamChunk(final=_result(self.name, text))


class Plain:
    """A provider without streaming (like Meta): one chunk with the whole answer."""

    def __init__(self, name: str, text: str = ANSWER) -> None:
        self.name = name
        self.text = text
        self.calls = 0

    def is_configured(self) -> bool:
        return True

    async def generate(self, request: LLMRequest, timeout_seconds: float) -> LLMResult:
        self.calls += 1
        return _result(self.name, self.text)


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
    monkeypatch.setattr(s, "AI_PRIMARY_BUDGET_SHARE", 0.6)
    monkeypatch.setattr(s, "AI_BREAKER_FAILURE_THRESHOLD", 3)
    monkeypatch.setattr(s, "AI_ANTHROPIC_CANARY_PERCENT", 100)
    monkeypatch.setattr(s, "AI_ANTHROPIC_CANARY_FEATURES", [])
    monkeypatch.setattr(s, "AI_ANTHROPIC_CANARY_COUNTRIES", [])
    health.reset()


def _router(anthropic: Any, meta: Any) -> ProviderRouter:
    async def no_country(kitchen_id: str) -> str | None:
        return None

    return ProviderRouter(
        {"anthropic": anthropic, "meta": meta},
        spend=Spend(),  # type: ignore[arg-type]
        kill=Kill(),  # type: ignore[arg-type]
        canary_gate=Canary(no_country),
    )


def _request() -> LLMRequest:
    return LLMRequest(
        feature="assistant",
        prompt_version="agent.v3",
        systems={"meta": "system"},
        messages=[Message.text("user", "How much chicken?")],
        request_id="r",
        kitchen_id="k",
        output_schema=Turn.model_json_schema(),
    )


async def _collect(router: ProviderRouter) -> tuple[list[str], Any, list[dict[str, Any]]]:
    deltas: list[str] = []
    value: Any = None
    with capture_logs() as logs:
        async for event in router.stream(
            _request(), parse=Turn.model_validate_json, budget_seconds=10, ttft_seconds=5
        ):
            if event.kind == "delta":
                deltas.append(event.text)
            else:
                value = event.value
    return deltas, value, [e for e in logs if e["event"] == "ai_call"]


async def test_primary_streams_deltas_then_the_validated_value() -> None:
    pieces = [ANSWER[:20], ANSWER[20:45], ANSWER[45:]]
    anthropic, meta = Streamer("anthropic", pieces), Plain("meta")
    deltas, value, logs = await _collect(_router(anthropic, meta))
    assert "".join(deltas) == ANSWER
    assert value.reply_text == "You have 1.9 kg of chicken."
    assert meta.calls == 0
    assert logs[-1]["outcome"] == "success"


async def test_failure_before_the_first_token_fails_over_to_meta() -> None:
    anthropic = Streamer("anthropic", [ProviderOverloaded("529")])
    meta = Plain("meta")
    deltas, value, logs = await _collect(_router(anthropic, meta))
    assert value.reply_text.startswith("You have")
    assert deltas == [ANSWER]  # Meta answers in one piece
    assert meta.calls == 1
    assert logs[-1]["outcome"] == "fallback"
    assert logs[-1]["fallback_reason"] == "overloaded"


async def test_failure_after_the_first_token_is_interrupted_not_failed_over() -> None:
    anthropic = Streamer("anthropic", [ANSWER[:20], ProviderOverloaded("529")])
    meta = Plain("meta")
    deltas: list[str] = []
    router = _router(anthropic, meta)
    with pytest.raises(AiStreamInterruptedError), capture_logs() as logs:
        async for event in router.stream(
            _request(), parse=Turn.model_validate_json, budget_seconds=10, ttft_seconds=5
        ):
            deltas.append(event.text)
    assert deltas == [ANSWER[:20]]
    assert meta.calls == 0, "the fallback must never finish a started answer"
    assert [e for e in logs if e["event"] == "ai_call"][-1]["outcome"] == "interrupted"


async def test_a_refusal_is_never_routed_to_meta() -> None:
    anthropic = Streamer("anthropic", [ProviderRefusal("refusal")])
    meta = Plain("meta")
    with pytest.raises(AiRefusedError):
        await _collect(_router(anthropic, meta))
    assert meta.calls == 0


async def test_both_down_before_any_token_is_unavailable() -> None:
    anthropic = Streamer("anthropic", [ProviderOverloaded("529")])

    class Down(Plain):
        async def generate(self, request: LLMRequest, timeout_seconds: float) -> LLMResult:
            self.calls += 1
            raise ProviderOverloaded("down")

    with pytest.raises(AiUnavailableError):
        await _collect(_router(anthropic, Down("meta")))


async def test_invalid_json_at_the_end_is_interrupted() -> None:
    anthropic = Streamer("anthropic", ['{"type": "answer", "reply_text": "cut'])
    with pytest.raises(AiStreamInterruptedError):
        await _collect(_router(anthropic, Plain("meta")))


def test_extractor_reads_only_the_reply_text_across_chunks() -> None:
    raw = '{"type": "answer", "reply_text": "Line \\"one\\"\\nCaf\\u00e9 ok", "params": null}'
    extractor = ReplyTextExtractor()
    shown = "".join(extractor.feed(raw[i : i + 3]) for i in range(0, len(raw), 3))
    assert shown == 'Line "one"\nCafé ok'


def test_extractor_shows_nothing_before_the_field() -> None:
    extractor = ReplyTextExtractor()
    assert extractor.feed('{"type": "proposal", "summ') == ""
    assert extractor.feed('ary": "x", "reply_') == ""
    assert extractor.feed('text": "Ok') == "Ok"


def test_sse_format() -> None:
    assert sse("delta", {"text": "Hi"}) == 'event: delta\ndata: {"text": "Hi"}\n\n'
