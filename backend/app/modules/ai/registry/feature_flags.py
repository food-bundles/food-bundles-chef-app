"""AI feature flags — all off by default (AI004).

All AI capabilities are opt-in. Enabling them requires:
1. AI_ENABLED = True in settings (global kill switch)
2. The specific capability flag set to True
3. Per-kitchen limits not exceeded (enforced by the gateway)

Never enable any capability in production without:
- Verified Meta Model API terms and data-use review
- Legal review for Rwanda data protection obligations
- Human-reviewed eval dataset with quality/cost/latency thresholds (see /ai-evals)
"""
from __future__ import annotations

from app.core.config import settings


def _has_provider() -> bool:
    return bool(settings.MODEL_API_KEY.get_secret_value() and settings.META_MUSE_SPARK_MODEL)


def quality_assessment_enabled() -> bool:
    return settings.AI_ENABLED and settings.AI_QUALITY_ASSESSMENT_ENABLED


def transcription_enabled() -> bool:
    return settings.AI_ENABLED and settings.AI_TRANSCRIPTION_ENABLED


def transcription_languages() -> list[str]:
    """Languages whose STT quality has been evaluated and approved."""
    if not transcription_enabled():
        return []
    return [lang.strip() for lang in settings.AI_TRANSCRIPTION_LANGUAGES.split(",") if lang.strip()]


def image_classify_enabled() -> bool:
    return settings.AI_ENABLED and settings.AI_IMAGE_CLASSIFY_ENABLED and _has_provider()


def menu_scan_enabled() -> bool:
    return settings.AI_ENABLED and settings.AI_MENU_SCAN_ENABLED and _has_provider()


def dish_analysis_enabled() -> bool:
    return settings.AI_ENABLED and settings.AI_DISH_ANALYSIS_ENABLED and _has_provider()


def document_scan_enabled() -> bool:
    """Reading line items from a delivery note or receipt photo."""
    return settings.AI_ENABLED and settings.AI_DOCUMENT_SCAN_ENABLED and _has_provider()


def assistant_enabled() -> bool:
    return settings.AI_AGENT_ENABLED and bool(settings.MODEL_API_KEY.get_secret_value())
