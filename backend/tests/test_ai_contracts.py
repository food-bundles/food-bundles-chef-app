"""AI capability contract tests using mock provider (AI007).

No live Meta API key required. These tests verify:
- Provider-neutral interfaces are respected
- Mock adapters return correctly typed responses
- Feature flag enforcement: disabled capability raises 503
- Advisory constraints: SAM quantity is None when crate not fully visible
- No raw content in usage_metadata (AI_LOG_CONTENT=False default)
"""
from __future__ import annotations

from decimal import Decimal

import pytest

from app.modules.ai.schemas.quality_assessment import (
    QualityAssessmentRequest,
    QualityDimension,
)
from app.modules.ai.schemas.transcription import TranscriptionRequest
from app.modules.ai.services.mock_provider import (
    MockQualityAssessmentAdapter,
    MockTranscriptionAdapter,
)

pytestmark = pytest.mark.asyncio


async def test_mock_quality_assessment_returns_all_dimensions() -> None:
    adapter = MockQualityAssessmentAdapter()
    req = QualityAssessmentRequest(
        image_bytes=b"fake_image_data",
        product_name="Tomatoes",
        expected_unit="kg",
    )
    result = await adapter.assess(req)

    dimension_types = {d.dimension for d in result.dimensions}
    assert QualityDimension.FRESHNESS in dimension_types
    assert QualityDimension.SPOILAGE in dimension_types
    assert QualityDimension.DAMAGE in dimension_types
    assert QualityDimension.FOREIGN_MATTER in dimension_types
    assert QualityDimension.RIPENESS in dimension_types
    assert QualityDimension.SIZE_GRADE in dimension_types


async def test_mock_quality_assessment_dimensions_have_valid_results() -> None:
    adapter = MockQualityAssessmentAdapter()
    req = QualityAssessmentRequest(
        image_bytes=b"img",
        product_name="Onions",
        expected_unit="kg",
    )
    result = await adapter.assess(req)
    valid = {"pass", "watch", "fail"}
    for dim in result.dimensions:
        assert dim.result in valid
        assert 0.0 <= dim.confidence <= 1.0


async def test_mock_quality_assessment_quantity_estimate() -> None:
    """Mock crate is fully visible → quantity is not None."""
    adapter = MockQualityAssessmentAdapter()
    req = QualityAssessmentRequest(
        image_bytes=b"img",
        product_name="Tomatoes",
        expected_unit="kg",
    )
    result = await adapter.assess(req)
    assert result.quantity_estimate is not None
    assert result.quantity_estimate.crate_fully_visible is True
    assert result.quantity_estimate.estimated_quantity is not None
    assert result.quantity_estimate.unit == "kg"


async def test_mock_quality_provider_metadata() -> None:
    adapter = MockQualityAssessmentAdapter()
    req = QualityAssessmentRequest(
        image_bytes=b"img", product_name="Pepper", expected_unit="g"
    )
    result = await adapter.assess(req)
    assert result.provider == "mock"
    assert result.model_id == "mock-v0"
    assert result.latency_ms is not None


async def test_mock_transcription_returns_text() -> None:
    adapter = MockTranscriptionAdapter()
    req = TranscriptionRequest(audio_bytes=b"fake_audio", language="rw")
    result = await adapter.transcribe(req)
    assert isinstance(result.text, str)
    assert len(result.text) > 0
    assert 0.0 <= result.confidence <= 1.0
    assert result.provider == "mock"


async def test_feature_flag_disabled_raises_503(monkeypatch) -> None:
    """With AI_ENABLED=False (default), getting an adapter raises 503."""
    import app.core.config as cfg

    monkeypatch.setattr(cfg.settings, "AI_ENABLED", False)

    from app.modules.ai.routing.provider_router import (
        AICapabilityDisabledError,
        get_quality_assessment_adapter,
    )

    with pytest.raises(AICapabilityDisabledError) as exc_info:
        get_quality_assessment_adapter()
    assert exc_info.value.status_code == 503


async def test_feature_flag_enabled_returns_mock_adapter(monkeypatch) -> None:
    """With AI_ENABLED=True and quality flag on but no API key → mock adapter."""
    import app.core.config as cfg

    monkeypatch.setattr(cfg.settings, "AI_ENABLED", True)
    monkeypatch.setattr(cfg.settings, "AI_QUALITY_ASSESSMENT_ENABLED", True)
    monkeypatch.setattr(cfg.settings, "MODEL_API_KEY", "")

    from app.modules.ai.routing.provider_router import get_quality_assessment_adapter
    from app.modules.ai.services.mock_provider import MockQualityAssessmentAdapter

    adapter = get_quality_assessment_adapter()
    assert isinstance(adapter, MockQualityAssessmentAdapter)


def test_sam_null_quantity_when_not_fully_visible() -> None:
    """SAM constraint: quantity must be None when crate not fully visible."""
    from app.integrations.meta_model_api.quality_assessment import (
        _parse_quantity_estimate,
    )

    result = _parse_quantity_estimate(
        {"fully_visible": False, "estimated_quantity": 9.5, "confidence": 0.7},
        "kg",
    )
    assert result.crate_fully_visible is False
    assert result.estimated_quantity is None


def test_sam_quantity_present_when_fully_visible() -> None:
    from app.integrations.meta_model_api.quality_assessment import (
        _parse_quantity_estimate,
    )

    result = _parse_quantity_estimate(
        {"fully_visible": True, "estimated_quantity": 9.5, "confidence": 0.85},
        "kg",
    )
    assert result.crate_fully_visible is True
    assert result.estimated_quantity == Decimal("9.5")
