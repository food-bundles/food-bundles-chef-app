"""Provider-neutral capability interfaces.

All AI capabilities declare these protocols. Concrete adapters (Meta hosted,
open-weight, mock) implement them. The registry selects the adapter at runtime
based on feature flags and per-kitchen limits.

Constraints from skill:
- AI cannot mutate stock, orders, deliveries or payments directly
- Manual receiving must always work when AI is down
- SAM segmentation: no freshness assessment, null if crate not fully visible
- Muse Voice: speech-to-text only, result goes to form field for chef review
- Muse Image: output never used as delivery evidence
- Chef measurement and decision always wins
"""
from __future__ import annotations

from typing import Protocol

from app.modules.ai.schemas.quality_assessment import (
    QualityAssessmentRequest,
    QualityAssessmentResponse,
)
from app.modules.ai.schemas.transcription import (
    TranscriptionRequest,
    TranscriptionResponse,
)


class QualityAssessmentCapability(Protocol):
    """Advisory quality assessment for a delivery item photo."""

    async def assess(
        self, request: QualityAssessmentRequest
    ) -> QualityAssessmentResponse:
        ...


class TranscriptionCapability(Protocol):
    """Speech-to-text for optional chef dictation."""

    async def transcribe(
        self, request: TranscriptionRequest
    ) -> TranscriptionResponse:
        ...
