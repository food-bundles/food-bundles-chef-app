"""Anthropic (Claude Messages API) adapter — the PRIMARY provider (Phase 8).

Uses the official `anthropic` Python SDK (2.x, API version 2026-10-21), verified
against the Claude API docs on 2026-11-18:
- model IDs come from settings (ANTHROPIC_MODEL_*), never from feature code;
- structured outputs: `output_config.format = {"type": "json_schema", "schema": ...}`,
  with the schema reduced to the supported subset (catalog.wire_schema);
- effort goes in `output_config.effort`, only for models whose capability map allows it;
- sampling parameters (temperature) are not accepted by these models and are never sent;
- images are base64 `image` blocks; the system prompt is marked for prompt caching
  (prompts below the model's cache minimum simply don't cache — no error);
- `stop_reason == "refusal"` (HTTP 200) is a refusal, never routed to another provider;
- SDK retries are off (max_retries=0): the router owns retries and the time budget.

The API key is read from settings only and is never logged or echoed.
"""

from __future__ import annotations

import base64
import time
from collections.abc import AsyncIterator
from typing import Any

import structlog

from app.core.config import settings
from app.modules.ai.providers import catalog
from app.modules.ai.providers.base import (
    ImagePart,
    LLMRequest,
    LLMResult,
    ProviderAuth,
    ProviderBadRequest,
    ProviderError,
    ProviderNetwork,
    ProviderOverloaded,
    StreamChunk,
    ProviderRateLimited,
    ProviderRefusal,
    ProviderTimeout,
    ProviderUnexpected,
    Usage,
)

logger = structlog.get_logger(__name__)


def _retry_after(exc: Any) -> float | None:
    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None)
    if headers is None:
        return None
    value = headers.get("retry-after")
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def map_sdk_error(exc: Exception) -> ProviderError:
    """Translate an SDK exception into a typed provider error (most specific first)."""
    import anthropic

    if isinstance(exc, anthropic.APITimeoutError):
        return ProviderTimeout("anthropic timeout")
    if isinstance(exc, anthropic.APIConnectionError):
        return ProviderNetwork("anthropic connection error")
    if isinstance(exc, anthropic.RateLimitError):
        return ProviderRateLimited("anthropic rate limited", retry_after=_retry_after(exc))
    if isinstance(exc, anthropic.AuthenticationError | anthropic.PermissionDeniedError):
        return ProviderAuth("anthropic auth error", status_code=exc.status_code)
    if isinstance(exc, anthropic.BadRequestError):
        return ProviderBadRequest("anthropic invalid request", status_code=400)
    if isinstance(exc, anthropic.APIStatusError):
        status = exc.status_code
        if status >= 500:
            return ProviderOverloaded(f"anthropic {status}", status_code=status)
        if status == 429:
            return ProviderRateLimited("anthropic rate limited", retry_after=_retry_after(exc))
        if status in (401, 403):
            return ProviderAuth("anthropic auth error", status_code=status)
        # 404 (unknown model), 413 and other 4xx are configuration/request bugs.
        return ProviderBadRequest(f"anthropic {status}", status_code=status)
    return ProviderUnexpected(f"anthropic {type(exc).__name__}")


def _content(parts: tuple[str | ImagePart, ...]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for part in parts:
        if isinstance(part, ImagePart):
            blocks.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": part.mime,
                        "data": base64.b64encode(part.data).decode("ascii"),
                    },
                }
            )
        else:
            blocks.append({"type": "text", "text": part})
    return blocks


def build_params(request: LLMRequest, model: str) -> dict[str, Any]:
    """The `messages.create` keyword arguments for this request (pure, testable)."""
    caps = catalog.capabilities(model)
    params: dict[str, Any] = {
        "model": model,
        "max_tokens": request.max_tokens,
        "system": [
            {
                "type": "text",
                "text": request.system_for("anthropic"),
                "cache_control": {"type": "ephemeral"},
            }
        ],
        "messages": [{"role": m.role, "content": _content(m.parts)} for m in request.messages],
    }
    output_config: dict[str, Any] = {}
    if request.output_schema is not None:
        output_config["format"] = {
            "type": "json_schema",
            "schema": catalog.wire_schema(request.output_schema),
        }
    if request.effort and caps["supports_effort"]:
        output_config["effort"] = request.effort
    if output_config:
        params["output_config"] = output_config
    if request.temperature is not None and caps["supports_temperature"]:
        params["extra_body"] = {"temperature": request.temperature}
    return params


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, client: Any | None = None) -> None:
        self._client = client  # injected in tests; built lazily otherwise

    def is_configured(self) -> bool:
        return bool(settings.ANTHROPIC_API_KEY.get_secret_value().strip())

    def _sdk_client(self) -> Any:
        if self._client is None:
            import anthropic

            self._client = anthropic.AsyncAnthropic(
                api_key=settings.ANTHROPIC_API_KEY.get_secret_value(),
                max_retries=0,
            )
        return self._client

    def warm_up(self) -> None:
        """Import the SDK and build the client at startup.

        The first import takes seconds; done lazily it would eat the first request's
        budget (measured live: a 10 s classify took 13-23 s on a cold process).
        """
        if self.is_configured() and settings.ANTHROPIC_ENABLED:
            self._sdk_client()

    async def generate(self, request: LLMRequest, timeout_seconds: float) -> LLMResult:
        model = catalog.anthropic_model(request.tier)
        params = build_params(request, model)
        started = time.monotonic()
        try:
            response = await self._sdk_client().messages.create(
                **params, timeout=max(1.0, timeout_seconds)
            )
        except ProviderError:
            raise
        except Exception as exc:  # SDK errors → typed provider errors
            raise map_sdk_error(exc) from None

        raw_usage = getattr(response, "usage", None)
        usage = Usage(
            input_tokens=int(getattr(raw_usage, "input_tokens", 0) or 0),
            output_tokens=int(getattr(raw_usage, "output_tokens", 0) or 0),
            cached_tokens=int(getattr(raw_usage, "cache_read_input_tokens", 0) or 0),
            cache_write_tokens=int(getattr(raw_usage, "cache_creation_input_tokens", 0) or 0),
        )
        stop_reason = str(getattr(response, "stop_reason", "") or "")
        if stop_reason == "refusal":
            details = getattr(response, "stop_details", None)
            error = ProviderRefusal("anthropic refusal")
            error.category = getattr(details, "category", None)  # type: ignore[attr-defined]
            error.usage = usage  # type: ignore[attr-defined]
            raise error
        text = next(
            (b.text for b in getattr(response, "content", []) if getattr(b, "type", "") == "text"),
            "",
        )
        return LLMResult(
            text=text,
            provider=self.name,
            model=str(getattr(response, "model", model) or model),
            latency_ms=round((time.monotonic() - started) * 1000),
            finish_reason=stop_reason,
            usage=usage,
        )


    async def stream(self, request: LLMRequest, timeout_seconds: float) -> AsyncIterator[StreamChunk]:
        """Stream text deltas (Messages API streaming), then one chunk with the final result.

        Same parameters as `generate`. A refusal is raised at the end (the router never
        routes a refusal to another provider); SDK errors map to typed provider errors.
        """
        model = catalog.anthropic_model(request.tier)
        params = build_params(request, model)
        started = time.monotonic()
        try:
            async with self._sdk_client().messages.stream(
                **params, timeout=max(1.0, timeout_seconds)
            ) as stream:
                async for text in stream.text_stream:
                    if text:
                        yield StreamChunk(text=text)
                response = await stream.get_final_message()
        except ProviderError:
            raise
        except Exception as exc:  # SDK errors → typed provider errors
            raise map_sdk_error(exc) from None
        raw_usage = getattr(response, "usage", None)
        usage = Usage(
            input_tokens=int(getattr(raw_usage, "input_tokens", 0) or 0),
            output_tokens=int(getattr(raw_usage, "output_tokens", 0) or 0),
            cached_tokens=int(getattr(raw_usage, "cache_read_input_tokens", 0) or 0),
            cache_write_tokens=int(getattr(raw_usage, "cache_creation_input_tokens", 0) or 0),
        )
        stop_reason = str(getattr(response, "stop_reason", "") or "")
        if stop_reason == "refusal":
            error = ProviderRefusal("anthropic refusal")
            error.usage = usage  # type: ignore[attr-defined]
            raise error
        text = next(
            (b.text for b in getattr(response, "content", []) if getattr(b, "type", "") == "text"),
            "",
        )
        yield StreamChunk(
            final=LLMResult(
                text=text,
                provider=self.name,
                model=str(getattr(response, "model", model) or model),
                latency_ms=round((time.monotonic() - started) * 1000),
                finish_reason=stop_reason,
                usage=usage,
            )
        )
