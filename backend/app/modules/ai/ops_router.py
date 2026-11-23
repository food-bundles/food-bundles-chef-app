"""Ops endpoints for the AI provider layer: health and the runtime kill switch.

Chefs have no roles, so these are protected by a server-side ops token
(AI_OPS_TOKEN, sent as X-Ops-Token) compared in constant time. With no token
configured the endpoints answer 404. Responses never contain key material.
"""

from __future__ import annotations

import hmac
from typing import Literal

from fastapi import APIRouter, Depends, Header, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError, UnauthorizedError
from app.modules.ai.providers import health
from app.modules.ai.providers.killswitch import kill_switch
from app.modules.ai.providers.router import provider_router
from app.modules.exchange_rates.health import RatesHealthResponse, rates_health

router = APIRouter(prefix="/ai", tags=["ai-ops"])

ProviderName = Literal["anthropic", "meta"]


def require_ops_token(x_ops_token: str | None = Header(default=None)) -> None:
    expected = settings.AI_OPS_TOKEN.get_secret_value()
    if not expected:
        raise NotFoundError("Not found.")
    if not x_ops_token:
        raise UnauthorizedError("Ops token required.")
    if not hmac.compare_digest(x_ops_token.encode(), expected.encode()):
        raise ForbiddenError("Invalid ops token.")


class ProviderHealth(BaseModel):
    name: str
    role: Literal["primary", "fallback", "unused"]
    configured: bool
    enabled: bool
    kill_switch: bool
    breaker_state: str
    last_success: str | None
    last_error: str | None
    p95_latency_ms: int | None
    primary_misconfigured: bool
    misconfigured_reason: str | None


class AiHealthResponse(BaseModel):
    primary: str
    fallback: str
    # Redis holds the kill switch shared by all instances. False means a kill-switch
    # change only reaches the instance that received it (Redis is required in production).
    redis_connected: bool
    providers: list[ProviderHealth]


@router.get("/health", response_model=AiHealthResponse, dependencies=[Depends(require_ops_token)])
async def ai_health() -> AiHealthResponse:
    providers = provider_router.providers()
    out: list[ProviderHealth] = []
    for name in ("anthropic", "meta"):
        stats = health.stats(name)
        provider = providers.get(name)
        role: Literal["primary", "fallback", "unused"] = (
            "primary"
            if name == settings.AI_PRIMARY_PROVIDER
            else "fallback"
            if name == settings.AI_FALLBACK_PROVIDER
            else "unused"
        )
        reason = stats.misconfigured
        if name == "anthropic" and reason is None and health.env_name_typo_present():
            reason = "env_name_typo"
        out.append(
            ProviderHealth(
                name=name,
                role=role,
                configured=bool(provider and provider.is_configured()),
                enabled=settings.ANTHROPIC_ENABLED if name == "anthropic" else True,
                kill_switch=await kill_switch.is_on(name),
                breaker_state=provider_router.breaker(name).state,
                last_success=stats.last_success.isoformat() if stats.last_success else None,
                last_error=stats.last_error,
                p95_latency_ms=stats.p95_ms(),
                primary_misconfigured=role == "primary" and reason is not None,
                misconfigured_reason=reason,
            )
        )
    return AiHealthResponse(
        primary=settings.AI_PRIMARY_PROVIDER,
        fallback=settings.AI_FALLBACK_PROVIDER,
        redis_connected=await kill_switch.ping(),
        providers=out,
    )


class KillSwitchRequest(BaseModel):
    on: bool


@router.put(
    "/kill-switch/{provider}",
    status_code=204,
    response_class=Response,
    dependencies=[Depends(require_ops_token)],
)
async def set_kill_switch(provider: ProviderName, body: KillSwitchRequest) -> Response:
    """Turn a provider off (or back on) for every instance within ~5 s, without a deploy."""
    await kill_switch.set(provider, body.on)
    return Response(status_code=204)


@router.get(
    "/rates-health",
    response_model=RatesHealthResponse,
    dependencies=[Depends(require_ops_token)],
)
async def exchange_rates_health(db: AsyncSession = Depends(get_db)) -> RatesHealthResponse:
    """Exchange-rate feed: last successful fetch per source, the age of the rate in use per
    kitchen currency, and the currencies with no usable rate (ops token, like /ai/health)."""
    return await rates_health(db)
