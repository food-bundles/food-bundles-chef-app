from __future__ import annotations

import hashlib
import time
import uuid

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = structlog.get_logger(__name__)

# Security headers applied to every response
_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    # HSTS — 1 year; enable only in production (set by SecurityHeadersMiddleware)
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}


def _client_request_id(value: str | None) -> str | None:
    """Accept a client-supplied request id only if it looks like one (no log injection)."""
    if value and 8 <= len(value) <= 64 and value.replace("-", "").isalnum():
        return value
    return None


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Attach a request_id to every request and response (the app's X-Request-ID when valid)."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = _client_request_id(request.headers.get("x-request-id")) or str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        response.headers["X-Request-ID"] = request_id

        log_fn = logger.warning if response.status_code >= 500 else logger.info
        log_fn(
            "request",
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        return response


_IDEMPOTENT_METHODS = {"POST", "PATCH", "PUT", "DELETE"}
_IDEMPOTENCY_TTL_SECONDS = 24 * 3600
_IDEMPOTENCY_MAX_ENTRIES = 5_000


class IdempotencyMiddleware(BaseHTTPMiddleware):
    """Replay the first successful response for a repeated `Idempotency-Key`.

    Keyed by (caller credential hash, method, path, key) so keys never collide across
    chefs. Only 2xx responses are stored, for 24 h. Used for AI-confirmed writes so a
    retry never records a sale, stock change or order twice.

    Process-local store: with several workers or instances, move it to Redis/DB.
    """

    def __init__(self, app, **kwargs) -> None:  # type: ignore[no-untyped-def]
        super().__init__(app, **kwargs)
        self._store: dict[str, tuple[float, int, bytes, str]] = {}

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        key = request.headers.get("idempotency-key")
        if request.method not in _IDEMPOTENT_METHODS or not key or not (8 <= len(key) <= 128):
            return await call_next(request)

        caller =hashlib.sha256(request.headers.get("authorization", "").encode()).hexdigest()[:16]
        store_key = f"{caller}:{request.method}:{request.url.path}:{key}"
        now = time.monotonic()
        hit = self._store.get(store_key)
        if hit and hit[0] > now:
            _, status, body, media_type = hit
            replay = Response(content=body, status_code=status, media_type=media_type)
            replay.headers["Idempotent-Replay"] = "true"
            return replay

        response = await call_next(request)
        if 200 <= response.status_code < 300:
            body = b"".join([chunk async for chunk in response.body_iterator])  # type: ignore[attr-defined]
            media_type = response.media_type or "application/json"
            self._store[store_key] = (now + _IDEMPOTENCY_TTL_SECONDS, response.status_code, body, media_type)
            if len(self._store) > _IDEMPOTENCY_MAX_ENTRIES:
                for k in [k for k, v in self._store.items() if v[0] <= now]:
                    del self._store[k]
            return Response(
                content=body,
                status_code=response.status_code,
                headers={k: v for k, v in response.headers.items() if k.lower() != "content-length"},
                media_type=media_type,
            )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to every response."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        for header, value in _SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        return response
