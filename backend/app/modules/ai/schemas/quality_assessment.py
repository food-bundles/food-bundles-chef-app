"""Schemas for AI-assisted delivery quality assessment."""
from __future__ import annotations

from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, Field


class QualityDimension(StrEnum):
    FRESHNESS = "freshness"
    RIPENESS = "ripeness"
    DAMAGE = "damage"
    SPOILAGE = "spoilage"
    SIZE_GRADE = "size_grade"
    FOREIGN_MATTER = "foreign_matter"


class QualityDimensionResult(BaseModel):
    dimension: QualityDimension
    result: str  # "pass" | "watch" | "fail"
    confidence: float = Field(..., ge=0.0, le=1.0)
    notes: str | None = None


class QuantityEstimate(BaseModel):
    """SAM 3.1 segmentation output.

    SAM does NOT assess freshness/spoilage — those come from Muse Spark.
    If the crate is not fully visible, estimated_quantity is null.
    Chef measurement always wins; this is advisory only.
    """
    estimated_quantity: Decimal | None = None
    unit: str | None = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    crate_fully_visible: bool = False


class QualityAssessmentRequest(BaseModel):
    image_bytes: bytes
    product_name: str
    expected_unit: str


class QualityAssessmentResponse(BaseModel):
    """Advisory AI output for a delivery item.

    The chef must confirm before any stock, order or receiving record changes.
    AI cannot mutate state directly.
    """
    dimensions: list[QualityDimensionResult]
    quantity_estimate: QuantityEstimate | None = None
    # Usage metadata for cost tracking (no content, no media)
    provider: str
    model_id: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    latency_ms: int | None = None
    # Safe to log — no raw media, no raw prompt
    usage_metadata: dict | None = None
