"""Meta Model API adapter — the FALLBACK provider.

Wraps the existing `MetaModelAPIClient.chat_completion` unchanged: same endpoint,
model, OpenAI-style messages, base64 data-URL images, max_tokens and its own
one-retry-on-connect-error behaviour. Only its errors are mapped to typed errors.
"""

from __future__ import annotations

import base64
import time

import httpx
from app.core.config import settings
from app.integrations.meta_model_api.client import MetaModelAPIError, get_client
from app.modules.ai.providers.base import (
    ImagePart,
    LLMRequest,
    LLMResult,
    Message,
    ProviderAuth,
    ProviderBadRequest,
    ProviderError,
    ProviderNetwork,
    ProviderOverloaded,
    ProviderRateLimited,
    ProviderTimeout,
    ProviderUnexpected,
    Usage,
)


def map_meta_error(exc: MetaModelAPIError) -> ProviderError:
    status = exc.status_code
    if status == 429:
        return ProviderRateLimited("meta rate limited")
    if status in (401, 403):
        return ProviderAuth("meta auth error", status_code=status)
    if status >= 500:
        return ProviderOverloaded(f"meta {status}", status_code=status)
    if status >= 400:
        return ProviderBadRequest(f"meta {status}", status_code=status)
    if "unreachable" in exc.message.lower():
        return ProviderNetwork("meta unreachable")
    return ProviderUnexpected("meta unexpected response")


def to_meta_messages(system: str, messages: list[Message]) -> list[dict]:
    """Neutral messages → the exact shape the gateway sent to Meta before Phase 8."""
    out: list[dict] = [{"role": "system", "content": system}]
    for m in messages:
        has_image = any(isinstance(p, ImagePart) for p in m.parts)
        if not has_image:
            out.append(
                {"role": m.role, "content": "".join(p for p in m.parts if isinstance(p, str))}
            )
            continue
        content: list[dict] = []
        for part in m.parts:
            if isinstance(part, ImagePart):
                data_url = f"data:{part.mime};base64,{base64.b64encode(part.data).decode('ascii')}"
                content.append({"type": "image_url", "image_url": {"url": data_url}})
            else:
                content.append({"type": "text", "text": part})
        out.append({"role": m.role, "content": content})
    return out


class MetaProvider:
    name = "meta"

    def is_configured(self) -> bool:
        return bool(settings.MODEL_API_KEY.get_secret_value() and settings.META_MUSE_SPARK_MODEL)

    async def generate(self, request: LLMRequest, timeout_seconds: float) -> LLMResult:
        model = request.meta_model or settings.META_MUSE_SPARK_MODEL
        messages = to_meta_messages(request.system_for("meta"), request.messages)
        started = time.monotonic()
        try:
            raw, usage = await get_client().chat_completion(
                messages, model, timeout_seconds, max_tokens=request.max_tokens
            )
        except httpx.TimeoutException:
            raise ProviderTimeout("meta timeout") from None
        except MetaModelAPIError as exc:
            raise map_meta_error(exc) from None
        return LLMResult(
            text=raw,
            provider=self.name,
            model=model,
            latency_ms=round((time.monotonic() - started) * 1000),
            finish_reason="stop",
            usage=Usage(
                input_tokens=int(usage.get("prompt_tokens") or 0),
                output_tokens=int(usage.get("completion_tokens") or 0),
            ),
        )
