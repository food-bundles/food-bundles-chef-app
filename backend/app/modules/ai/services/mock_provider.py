"""Mock AI provider for CI and development (AI007).

Simulates ~1s latency and returns deterministic advisory results.
No live API key required. All results are clearly advisory and must be
confirmed by the chef before any record changes.
"""
from __future__ import annotations

import asyncio
from decimal import Decimal

from app.modules.ai.schemas.quality_assessment import (
    QualityAssessmentRequest,
    QualityAssessmentResponse,
    QualityDimension,
    QualityDimensionResult,
    QuantityEstimate,
)
from app.modules.ai.schemas.transcription import (
    TranscriptionRequest,
    TranscriptionResponse,
)

_MOCK_PROVIDER = "mock"
_MOCK_MODEL = "mock-v0"


class MockQualityAssessmentAdapter:
    """Returns deterministic pass results for all quality dimensions."""

    async def assess(
        self, request: QualityAssessmentRequest
    ) -> QualityAssessmentResponse:
        await asyncio.sleep(0.05)  # simulate minimal latency in tests
        return QualityAssessmentResponse(
            dimensions=[
                QualityDimensionResult(
                    dimension=QualityDimension.FRESHNESS,
                    result="pass",
                    confidence=0.85,
                ),
                QualityDimensionResult(
                    dimension=QualityDimension.RIPENESS,
                    result="pass",
                    confidence=0.80,
                ),
                QualityDimensionResult(
                    dimension=QualityDimension.DAMAGE,
                    result="pass",
                    confidence=0.90,
                ),
                QualityDimensionResult(
                    dimension=QualityDimension.SPOILAGE,
                    result="pass",
                    confidence=0.95,
                ),
                QualityDimensionResult(
                    dimension=QualityDimension.SIZE_GRADE,
                    result="watch",
                    confidence=0.70,
                ),
                QualityDimensionResult(
                    dimension=QualityDimension.FOREIGN_MATTER,
                    result="pass",
                    confidence=0.99,
                ),
            ],
            quantity_estimate=QuantityEstimate(
                # SAM does not assess freshness; fully visible crate assumed
                estimated_quantity=Decimal("9.8"),
                unit=request.expected_unit,
                confidence=0.75,
                crate_fully_visible=True,
            ),
            provider=_MOCK_PROVIDER,
            model_id=_MOCK_MODEL,
            input_tokens=None,
            output_tokens=None,
            latency_ms=50,
            usage_metadata={"mock": True},
        )


class MockTranscriptionAdapter:
    """Returns a fixed transcription for tests."""

    async def transcribe(
        self, request: TranscriptionRequest
    ) -> TranscriptionResponse:
        await asyncio.sleep(0.01)
        return TranscriptionResponse(
            text="[mock transcription]",
            confidence=0.99,
            provider=_MOCK_PROVIDER,
            model_id=_MOCK_MODEL,
            latency_ms=10,
            usage_metadata={"mock": True},
        )
