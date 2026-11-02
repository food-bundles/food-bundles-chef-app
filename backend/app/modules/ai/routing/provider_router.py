"""Routes AI capability requests to the configured provider adapter.

At startup, read AI_ENABLED and per-capability flags. If a capability is
disabled, calling it raises AICapabilityDisabledError immediately — the caller
is responsible for graceful fallback (e.g. show the manual entry form).

Provider selection order:
1. If APP_ENV == "development" and no live model key configured → mock
2. If META_MODEL_API_KEY is set → Meta hosted adapters
3. Else → mock (safe default; logs a warning)
"""
from __future__ import annotations

import structlog

from app.core.config import settings
from app.core.exceptions import AppError
from app.modules.ai.domain.interfaces import (
    QualityAssessmentCapability,
    TranscriptionCapability,
)
from app.modules.ai.registry.feature_flags import (
    quality_assessment_enabled,
    transcription_enabled,
)
from app.modules.ai.services.mock_provider import (
    MockQualityAssessmentAdapter,
    MockTranscriptionAdapter,
)

logger = structlog.get_logger(__name__)


class AICapabilityDisabledError(AppError):
    status_code = 503
    error_code = "AI_CAPABILITY_DISABLED"

    def __init__(self, capability: str) -> None:
        super().__init__(message=f"AI capability '{capability}' is not enabled.")


def get_quality_assessment_adapter() -> QualityAssessmentCapability:
    if not quality_assessment_enabled():
        raise AICapabilityDisabledError("quality_assessment")
    return _build_quality_assessment_adapter()


def get_transcription_adapter() -> TranscriptionCapability:
    if not transcription_enabled():
        raise AICapabilityDisabledError("transcription")
    return _build_transcription_adapter()


def _build_quality_assessment_adapter() -> QualityAssessmentCapability:
    if _use_meta_provider():
        from app.integrations.meta_model_api.quality_assessment import (
            MetaQualityAssessmentAdapter,
        )
        return MetaQualityAssessmentAdapter()
    logger.warning("ai_using_mock_adapter", capability="quality_assessment")
    return MockQualityAssessmentAdapter()


def _build_transcription_adapter() -> TranscriptionCapability:
    if _use_meta_provider():
        from app.integrations.meta_model_api.transcription import (
            MetaTranscriptionAdapter,
        )
        return MetaTranscriptionAdapter()
    logger.warning("ai_using_mock_adapter", capability="transcription")
    return MockTranscriptionAdapter()


def _use_meta_provider() -> bool:
    return bool(settings.MODEL_API_KEY)
