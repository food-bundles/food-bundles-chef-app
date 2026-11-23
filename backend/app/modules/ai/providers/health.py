"""In-process provider health: last success, recent latencies, misconfiguration flags,
and the startup configuration check. Never holds or reports key material.
"""

from __future__ import annotations

import os
from collections import deque
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

import structlog
from app.core.config import settings

logger = structlog.get_logger(__name__)

TYPO_ENV_NAME = "ANTROPIC_API_KEY"


@dataclass
class ProviderStats:
    latencies_ms: deque[int] = field(default_factory=lambda: deque(maxlen=200))
    last_success: datetime | None = None
    last_error: str | None = None
    misconfigured: str | None = None  # "auth" | "env_name_typo"

    def p95_ms(self) -> int | None:
        if not self.latencies_ms:
            return None
        ordered = sorted(self.latencies_ms)
        return ordered[min(len(ordered) - 1, int(round(0.95 * (len(ordered) - 1))))]


_stats: dict[str, ProviderStats] = {}


def stats(provider: str) -> ProviderStats:
    return _stats.setdefault(provider, ProviderStats())


def record_success(provider: str, latency_ms: int) -> None:
    s = stats(provider)
    s.latencies_ms.append(latency_ms)
    s.last_success = datetime.now(UTC)
    s.last_error = None
    if s.misconfigured == "auth":
        s.misconfigured = None  # a working call proves the credential is fine again


def record_failure(provider: str, kind: str) -> None:
    s = stats(provider)
    s.last_error = kind
    if kind == "auth":
        s.misconfigured = "auth"


def reset() -> None:
    """Tests only."""
    _stats.clear()


# ── Startup configuration check ────────────────────────────────────────────────


def env_name_typo_present(
    environ: dict[str, str] | None = None, env_file: Path | None = None
) -> bool:
    """True when the misspelled ANTROPIC_API_KEY is set but ANTHROPIC_API_KEY is not.

    The misspelled variable is never used as a key — this only drives a warning.
    """
    if settings.ANTHROPIC_API_KEY.get_secret_value().strip():
        return False
    env = os.environ if environ is None else environ
    if (env.get(TYPO_ENV_NAME) or "").strip():
        return True
    path = env_file if env_file is not None else Path(".env")
    if path.is_file():
        from dotenv import dotenv_values

        return bool((dotenv_values(path).get(TYPO_ENV_NAME) or "").strip())
    return False


def env_key_shadowed(environ: dict[str, str] | None = None, env_file: Path | None = None) -> bool:
    """True when ANTHROPIC_API_KEY is set in the process environment AND in .env with
    a different value. The process value wins (pydantic-settings precedence), which
    hid a valid .env key behind a stale Windows user variable on 2026-11-18.
    Compares values only; never logs them.
    """
    env = os.environ if environ is None else environ
    process_value = (env.get("ANTHROPIC_API_KEY") or "").strip()
    path = env_file if env_file is not None else Path(".env")
    if not process_value or not path.is_file():
        return False
    from dotenv import dotenv_values

    file_value = (dotenv_values(path).get("ANTHROPIC_API_KEY") or "").strip()
    return bool(file_value) and file_value != process_value


def check_configuration() -> None:
    """Log clear warnings (never crash) when the primary provider can't be used."""
    if settings.AI_PRIMARY_PROVIDER != "anthropic":
        return
    if env_name_typo_present():
        stats("anthropic").misconfigured = "env_name_typo"
        logger.warning(
            "ai_config_warning",
            message="found ANTROPIC_API_KEY — rename to ANTHROPIC_API_KEY",
        )
    if env_key_shadowed():
        logger.warning(
            "ai_config_warning",
            message=(
                "ANTHROPIC_API_KEY from the process environment overrides a different "
                "value in .env; remove the stale environment variable"
            ),
        )
    if not settings.ANTHROPIC_API_KEY.get_secret_value().strip():
        logger.warning(
            "ai_config_warning",
            message="ANTHROPIC_API_KEY is not set: AI calls use the fallback provider",
            fallback=settings.AI_FALLBACK_PROVIDER,
        )
    elif not settings.ANTHROPIC_ENABLED:
        logger.warning(
            "ai_config_warning",
            message="ANTHROPIC_ENABLED=false: AI calls use the fallback provider",
            fallback=settings.AI_FALLBACK_PROVIDER,
        )
    if settings.AI_FALLBACK_PROVIDER == "meta" and not (
        settings.MODEL_API_KEY.get_secret_value() and settings.META_MUSE_SPARK_MODEL
    ):
        logger.warning("ai_config_warning", message="fallback provider meta is not configured")
