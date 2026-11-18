"""Provider router: primary → fallback with retries, repair, breaker, budgets and logging.

Failover rules (docs/ai-providers.md has the full table):
- skip a provider (no call) when: no key → "no_key", ANTHROPIC_ENABLED=false → "disabled",
  kill switch on → "kill_switch", breaker open → "breaker_open", daily budget → "budget";
- fail over on timeout, network error, 5xx/529 overloaded, 429 after retries, auth errors
  (provider flagged misconfigured), unexpected SDK errors, schema failure after ONE repair;
- never fail over on 400 (our bug → logged at error level) or on a refusal.
Retries (≤ AI_ROUTER_MAX_RETRIES, ≤ 2) use exponential backoff with jitter and honour
retry-after, only while the time budget allows. All routed calls are side-effect free:
the model only proposes; writes happen later through idempotent APIs after the chef confirms.
"""

from __future__ import annotations

import asyncio
import json
import random
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field, replace
from typing import Generic, Literal, TypeVar

import structlog
from app.core.config import settings
from app.core.exceptions import (
    AiBadOutputError,
    AiBudgetExceededError,
    AiPrimaryFailedError,
    AiProviderError,
    AiRefusedError,
    AiTimeoutError,
    AiUnavailableError,
)
from app.modules.ai.providers import catalog, health
from app.modules.ai.providers.base import (
    LLMProvider,
    LLMRequest,
    LLMResult,
    Message,
    ProviderError,
    ProviderSchemaError,
    ProviderTimeout,
    Usage,
)
from app.modules.ai.providers.breaker import CircuitBreaker
from app.modules.ai.providers.killswitch import KillSwitch, kill_switch
from app.modules.ai.providers.spend import SpendTracker, spend_tracker
from pydantic import ValidationError

logger = structlog.get_logger(__name__)

T = TypeVar("T")
# default: primary, then fallback. meta_only: Meta alone (quality assessment).
# no_failover: when the primary is available it is the ONLY provider tried (full budget);
# if it fails the caller gets AiPrimaryFailedError. When the primary is skipped
# (no key, disabled, kill switch, breaker open, budget) the fallback serves as usual.
Policy = Literal["default", "meta_only", "no_failover"]
_PARSE_ERRORS = (json.JSONDecodeError, ValidationError, ValueError, TypeError)
_REPAIR_MIN_SECONDS = 3.0
# The router enforces each attempt's deadline itself: httpx timeouts apply per phase
# (connect/write/read), so a provider call could otherwise run well past its budget
# (measured live: a 10 s classify ran 18.7 s). The grace lets the provider's own
# timeout fire first when it can.
_DEADLINE_GRACE_SECONDS = 0.25


@dataclass
class Routed(Generic[T]):
    value: T
    provider: str
    model: str
    repaired: bool
    fallback_reason: str | None  # the primary was called and failed
    usage: Usage
    cost_usd: float
    skip_reason: str | None = None  # the primary was not called at all


@dataclass
class _Billed:
    provider: str
    model: str
    usage: Usage = field(default_factory=Usage)


class ProviderRouter:
    def __init__(
        self,
        providers: dict[str, LLMProvider] | None = None,
        *,
        spend: SpendTracker | None = None,
        kill: KillSwitch | None = None,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._providers = providers
        self._spend = spend or spend_tracker
        self._kill = kill or kill_switch
        self._sleep = sleep
        self._clock = clock
        self._breakers: dict[str, CircuitBreaker] = {}

    # ── wiring ─────────────────────────────────────────────────────────────────

    def providers(self) -> dict[str, LLMProvider]:
        if self._providers is None:
            from app.integrations.anthropic.client import AnthropicProvider
            from app.modules.ai.providers.meta_provider import MetaProvider

            self._providers = {"anthropic": AnthropicProvider(), "meta": MetaProvider()}
        return self._providers

    def breaker(self, name: str) -> CircuitBreaker:
        if name not in self._breakers:
            self._breakers[name] = CircuitBreaker(
                settings.AI_BREAKER_FAILURE_THRESHOLD,
                settings.AI_BREAKER_COOLDOWN_MS / 1000,
                clock=self._clock,
            )
        return self._breakers[name]

    def order(self, policy: Policy) -> list[str]:
        if policy == "meta_only":
            return ["meta"]
        names: list[str] = [settings.AI_PRIMARY_PROVIDER]
        if settings.AI_FALLBACK_PROVIDER not in ("none", settings.AI_PRIMARY_PROVIDER):
            names.append(settings.AI_FALLBACK_PROVIDER)
        return names

    async def skip_reason(self, name: str, budget_action: str) -> str | None:
        provider = self.providers().get(name)
        if provider is None or not provider.is_configured():
            return "no_key"
        if name == "anthropic" and not settings.ANTHROPIC_ENABLED:
            return "disabled"
        if await self._kill.is_on(name):
            return "kill_switch"
        if name == "anthropic" and budget_action == "fallback":
            return "budget"
        if self.breaker(name).state == "open":
            return "breaker_open"
        return None

    # ── main entry ─────────────────────────────────────────────────────────────

    async def run(
        self,
        request: LLMRequest,
        *,
        parse: Callable[[str], T],
        budget_seconds: float,
        policy: Policy = "default",
    ) -> Routed[T]:
        started = self._clock()
        deadline = started + budget_seconds
        decision = await self._spend.check(request.kitchen_id)
        if decision.action == "block":
            self._log(request, started, outcome="budget_blocked", attempted=[], billed=[])
            raise AiBudgetExceededError()
        if decision.action == "cheaper_tier":
            request = replace(request, tier=catalog.cheaper_tier(request.tier))

        order = self.order(policy)
        candidates: list[str] = []
        # skip_reason: the primary was never called (no_key, disabled, kill_switch,
        # budget, breaker_open). fallback_reason: it was called and failed. Kept apart
        # so the fallback-rate alert counts real failovers only.
        skip_reason: str | None = None
        fallback_reason: str | None = None
        for name in order:
            reason = await self.skip_reason(name, decision.action)
            if reason is None:
                candidates.append(name)
            elif skip_reason is None:
                skip_reason = reason

        primary_only = policy == "no_failover" and bool(candidates) and candidates[0] == order[0]
        if primary_only:
            candidates = candidates[:1]

        attempted: list[str] = []
        billed: list[_Billed] = []
        last_error: ProviderError | None = None
        try:
            for index, name in enumerate(candidates):
                breaker = self.breaker(name)
                if not breaker.allow():
                    if not attempted:
                        skip_reason = skip_reason or "breaker_open"
                    continue
                attempted.append(name)
                is_last = index == len(candidates) - 1
                remaining = deadline - self._clock()
                share = 1.0 if is_last else settings.AI_PRIMARY_BUDGET_SHARE
                attempt_deadline = self._clock() + max(0.0, remaining * share)
                try:
                    value, result, repaired = await self._attempt(
                        self.providers()[name], request, parse, attempt_deadline, is_last, billed
                    )
                except ProviderError as exc:
                    last_error = exc
                    if exc.counts_for_breaker:
                        breaker.record_failure()
                    else:
                        breaker.release()
                    health.record_failure(name, exc.kind)
                    if exc.kind == "auth":
                        logger.critical("ai_provider_auth_failed", provider=name)
                    if not exc.failover:
                        raise
                    if not primary_only:
                        fallback_reason = fallback_reason or exc.kind
                    continue

                breaker.record_success()
                health.record_success(name, result.latency_ms)
                served_usage = billed[-1].usage if billed else result.usage
                is_primary = name == order[0]
                routed = Routed(
                    value=value,
                    provider=name,
                    model=result.model,
                    repaired=repaired,
                    fallback_reason=None if is_primary else fallback_reason,
                    usage=served_usage,
                    cost_usd=catalog.cost_usd(result.model, served_usage),
                    skip_reason=None if is_primary or fallback_reason else skip_reason,
                )
                if routed.fallback_reason:
                    outcome = "fallback"
                elif routed.skip_reason:
                    outcome = "primary_skipped"
                else:
                    outcome = "repaired" if repaired else "success"
                self._log(
                    request,
                    started,
                    outcome=outcome,
                    attempted=attempted,
                    billed=billed,
                    served=name,
                    model=result.model,
                    fallback_reason=routed.fallback_reason,
                    skip_reason=routed.skip_reason,
                    repaired=repaired,
                )
                return routed
        except ProviderError as exc:
            outcome = "refused" if exc.kind == "refused" else exc.kind
            self._log(
                request,
                started,
                outcome=outcome,
                attempted=attempted,
                billed=billed,
                fallback_reason=fallback_reason,
                skip_reason=skip_reason,
                level="error" if exc.kind == "bad_request" else "info",
            )
            if exc.kind == "refused":
                raise AiRefusedError() from None
            if primary_only:
                raise AiPrimaryFailedError() from None
            raise AiProviderError(f"{request.feature} request rejected by provider") from None
        finally:
            await self._record_spend(request.kitchen_id, billed)

        # Nothing served the request.
        if primary_only:
            self._log(
                request,
                started,
                outcome=last_error.kind if last_error else "breaker_open",
                attempted=attempted,
                billed=billed,
                skip_reason=skip_reason,
                policy=policy,
            )
            raise AiPrimaryFailedError()
        both = len(attempted) > 1 or not attempted
        outcome = "both_failed" if both else (last_error.kind if last_error else "both_failed")
        self._log(
            request,
            started,
            outcome=outcome,
            attempted=attempted,
            billed=billed,
            fallback_reason=fallback_reason,
            skip_reason=skip_reason,
        )
        if both or last_error is None:
            raise AiUnavailableError()
        # Only one provider was tried (e.g. pure Meta path): same errors as before Phase 8.
        if last_error.kind == "timeout":
            raise AiTimeoutError()
        if last_error.kind == "schema_fail":
            raise AiBadOutputError()
        raise AiProviderError(f"{request.feature} provider error")

    # ── one provider: retries + one repair ─────────────────────────────────────

    async def _attempt(
        self,
        provider: LLMProvider,
        request: LLMRequest,
        parse: Callable[[str], T],
        deadline: float,
        is_last: bool,
        billed: list[_Billed],
    ) -> tuple[T, LLMResult, bool]:
        retries = 0
        repaired = False
        messages = list(request.messages)
        entry = _Billed(provider=provider.name, model="")
        billed.append(entry)
        while True:
            remaining = deadline - self._clock()
            if repaired and is_last:
                remaining = max(remaining, _REPAIR_MIN_SECONDS)
            if remaining <= 0:
                raise ProviderTimeout(f"{provider.name} budget exhausted")
            try:
                result = await asyncio.wait_for(
                    provider.generate(replace(request, messages=messages), remaining),
                    timeout=remaining + _DEADLINE_GRACE_SECONDS,
                )
            except TimeoutError:
                raise ProviderTimeout(f"{provider.name} exceeded its time budget") from None
            except ProviderError as exc:
                usage = getattr(exc, "usage", None)
                if isinstance(usage, Usage):
                    entry.usage.add(usage)
                if exc.retryable and retries < settings.AI_ROUTER_MAX_RETRIES:
                    delay = getattr(exc, "retry_after", None)
                    if delay is None:
                        delay = 0.5 * (2**retries) + random.uniform(0, 0.25)  # noqa: S311  # nosec B311 — retry jitter, not crypto
                    if delay < deadline - self._clock() - 1.0:
                        retries += 1
                        await self._sleep(delay)
                        continue
                raise
            entry.model = result.model
            entry.usage.add(result.usage)
            try:
                return parse(result.text), result, repaired
            except _PARSE_ERRORS as first_error:
                if repaired:
                    raise ProviderSchemaError(
                        f"{provider.name} output invalid after repair"
                    ) from None
                if not is_last and deadline - self._clock() < _REPAIR_MIN_SECONDS:
                    raise ProviderSchemaError(f"{provider.name} output invalid") from None
                repaired = True
                messages = [
                    *request.messages,
                    Message.text("assistant", result.text[:6000]),
                    Message.text(
                        "user",
                        "Your answer was not valid for the required JSON schema. "
                        f"Problems: {str(first_error)[:800]}. "
                        "Reply again with ONLY the corrected JSON object.",
                    ),
                ]

    # ── accounting and logs ────────────────────────────────────────────────────

    async def _record_spend(self, kitchen_id: str, billed: list[_Billed]) -> None:
        for item in billed:
            if not item.model or (item.usage.input_tokens == 0 and item.usage.output_tokens == 0):
                continue
            await self._spend.record(
                kitchen_id=kitchen_id,
                provider=item.provider,
                model=item.model,
                usage=item.usage,
                cost=catalog.cost_usd(item.model, item.usage),
            )

    def _log(
        self,
        request: LLMRequest,
        started: float,
        *,
        outcome: str,
        attempted: list[str],
        billed: list[_Billed],
        served: str | None = None,
        model: str | None = None,
        fallback_reason: str | None = None,
        skip_reason: str | None = None,
        repaired: bool = False,
        level: str = "info",
        policy: str | None = None,
    ) -> None:
        usage = Usage()
        cost = 0.0
        for item in billed:
            usage.add(item.usage)
            cost += catalog.cost_usd(item.model, item.usage) if item.model else 0.0
        getattr(logger, level)(
            "ai_call",
            feature=request.feature,
            prompt_version=request.prompt_version,
            request_id=request.request_id,
            kitchen_id=request.kitchen_id,
            provider_attempted=",".join(attempted) or None,
            provider_served=served,
            fallback_reason=fallback_reason,
            skip_reason=skip_reason,
            policy=policy,
            model=model,
            latency_ms=round((self._clock() - started) * 1000),
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            cached_tokens=usage.cached_tokens,
            cache_write_tokens=usage.cache_write_tokens,
            cost_usd=round(cost, 6),
            outcome=outcome,
            repaired=repaired,
        )


provider_router = ProviderRouter()
