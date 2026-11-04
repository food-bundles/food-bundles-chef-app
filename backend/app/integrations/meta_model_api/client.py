"""Meta Model API HTTP client (AI003).

Verify current endpoints, model IDs, auth headers and rate limits at:
  https://dev.meta.ai/docs/overview
  https://dev.meta.ai/docs/models
  https://dev.meta.ai/docs/pricing-rate-limits

This client MUST be re-verified against official documentation before any
production deployment. Model IDs, endpoints and auth mechanisms change.

Privacy constraints (AI008):
- Standard mode: prefer for sensitive workloads
- Contributor mode requires explicit data-use approval from each chef
- Never send unrelated supplier data, PII or kitchen business data beyond
  what is strictly necessary for the requested capability
- No raw media or prompt content is logged (AI_LOG_CONTENT must be False)
"""
from __future__ import annotations

import os

import httpx
import certifi
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

_DEFAULT_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
}


class MetaModelAPIError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class MetaModelAPIClient:
    """Thin async HTTP client for the Meta Model API.

    Re-verify base URL, auth header name and token format before use.
    The client uses a bounded retry (AI_MAX_RETRIES) with no jitter —
    add jitter before high-volume production use.
    """

    def __init__(self) -> None:
        self._base_url = settings.META_MODEL_API_BASE_URL.rstrip("/")
        self._api_key = settings.MODEL_API_KEY
        self._timeout = settings.AI_DEFAULT_TIMEOUT_SECONDS
        self._max_retries = settings.AI_MAX_RETRIES

    async def post_json(self, path: str, payload: dict) -> dict:
        """POST JSON to a Meta Model API endpoint, returning the JSON response."""
        url = f"{self._base_url}/{path.lstrip('/')}"
        headers = {
            **_DEFAULT_HEADERS,
            # Re-verify header name against official docs before deployment
            "Authorization": f"Bearer {self._api_key}",
        }
        last_exc: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                ssl_verify = os.environ.get("SSL_CERT_FILE", certifi.where())
                async with httpx.AsyncClient(timeout=self._timeout, verify=ssl_verify) as client:
                    response = await client.post(url, headers=headers, json=payload)
                if response.status_code >= 500:
                    raise MetaModelAPIError(
                        response.status_code,
                        f"Meta API server error: {response.status_code}",
                    )
                if response.status_code >= 400:
                    raise MetaModelAPIError(
                        response.status_code,
                        f"Meta API client error: {response.status_code}",
                    )
                return response.json()
            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                last_exc = exc
                logger.warning(
                    "meta_api_retry",
                    attempt=attempt + 1,
                    max=self._max_retries + 1,
                    # no URL logged to avoid leaking kitchen context
                )
        raise MetaModelAPIError(0, f"Meta API unreachable after retries: {last_exc}")

    async def chat(
        self,
        system_prompt: str,
        messages: list[dict[str, str]],
        max_tokens: int = 4096,
    ) -> str:
        """Send a chat completion request to Muse Spark and return the text content.

        Re-verify /v1/chat/completions path and response schema before production use.
        Never logs prompt content (AI_LOG_CONTENT=False).
        muse-spark-1.3 uses reasoning tokens internally; needs a large max_tokens
        budget so output tokens remain after reasoning completes.
        """
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        payload = {
            "model": settings.META_MUSE_SPARK_MODEL,
            "messages": full_messages,
            "max_tokens": max_tokens,
        }
        response = await self.post_json("/chat/completions", payload)
        try:
            content = response["choices"][0]["message"]["content"]
            if content is None:
                reasoning = response.get("usage", {}).get("completion_tokens_details", {}).get("reasoning_tokens", 0)
                raise MetaModelAPIError(
                    0,
                    f"Muse Spark returned null content (all {reasoning} tokens used for reasoning). "
                    "Increase max_tokens or simplify the prompt."
                )
            return content
        except (KeyError, IndexError) as exc:
            raise MetaModelAPIError(0, f"Unexpected Muse Spark response shape: {exc}") from exc

    async def post_multipart(self, path: str, fields: dict, files: dict) -> dict:
        """POST multipart form data (for image/audio uploads)."""
        url = f"{self._base_url}/{path.lstrip('/')}"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
        }
        last_exc: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                ssl_verify = os.environ.get("SSL_CERT_FILE", certifi.where())
                async with httpx.AsyncClient(timeout=self._timeout, verify=ssl_verify) as client:
                    response = await client.post(
                        url, headers=headers, data=fields, files=files
                    )
                if response.status_code >= 400:
                    raise MetaModelAPIError(
                        response.status_code,
                        f"Meta API error: {response.status_code}",
                    )
                return response.json()
            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                last_exc = exc
                logger.warning("meta_api_retry_multipart", attempt=attempt + 1)
        raise MetaModelAPIError(0, f"Meta API unreachable: {last_exc}")


_client = MetaModelAPIClient()


async def chat(
    system_prompt: str,
    messages: list[dict[str, str]],
    max_tokens: int = 4096,
) -> str:
    """Module-level chat helper."""
    return await _client.chat(system_prompt=system_prompt, messages=messages, max_tokens=max_tokens)
