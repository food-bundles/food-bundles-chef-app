"""Meta hosted quality assessment adapter using Muse Spark + SAM 3.1.

IMPORTANT: Re-verify before use:
  - Muse Spark model ID for multimodal structured output: settings.META_MUSE_SPARK_MODEL
  - SAM 3.1 segmentation endpoint: settings.META_SAM_MODEL
  - Request/response schema against https://dev.meta.ai/docs/models
  - Pricing and per-request image size limits
  - Data terms: Standard mode preferred for sensitive delivery workloads

Constraints (from skill):
  - SAM segmentation never assesses freshness or spoilage
  - If crate not fully visible, quantity_estimate.estimated_quantity = None
  - Muse Image output is never delivery evidence
  - Chef measurement and decision always wins
"""
from __future__ import annotations

import io
import time
from decimal import Decimal

import structlog

from app.core.config import settings
from app.integrations.meta_model_api.client import MetaModelAPIClient
from app.modules.ai.schemas.quality_assessment import (
    QualityAssessmentRequest,
    QualityAssessmentResponse,
    QualityDimension,
    QualityDimensionResult,
    QuantityEstimate,
)

logger = structlog.get_logger(__name__)

# Re-verify these prompt templates against actual Muse Spark capabilities
_QUALITY_SYSTEM_PROMPT = (
    "You are a food quality assessment assistant. "
    "Assess only the visible quality dimensions: "
    "freshness, ripeness, damage, spoilage, size_grade, foreign_matter. "
    "Return structured JSON only. Do not include PII or supplier names."
)


class MetaQualityAssessmentAdapter:
    """Muse Spark (visual quality dims) + SAM 3.1 (quantity, no freshness).

    UNVERIFIED STUB — re-verify endpoint paths, payload schema and model IDs
    against official Meta docs before enabling in production.
    """

    def __init__(self) -> None:
        self._client = MetaModelAPIClient()

    async def assess(
        self, request: QualityAssessmentRequest
    ) -> QualityAssessmentResponse:
        t0 = time.monotonic()

        if len(request.image_bytes) > settings.AI_MAX_IMAGE_SIZE_BYTES:
            raise ValueError(
                f"Image exceeds {settings.AI_MAX_IMAGE_SIZE_BYTES} bytes limit. "
                "Resize to ≤ 1 MB before sending."
            )

        # STUB: actual Muse Spark multimodal payload — re-verify schema
        quality_resp = await self._client.post_multipart(
            path="/v1/chat/completions",  # re-verify
            fields={
                "model": settings.META_MUSE_SPARK_MODEL,
                "messages": (
                    '[{"role":"system","content":"'
                    + _QUALITY_SYSTEM_PROMPT
                    + '"},{"role":"user","content":"Assess this delivery item: '
                    + request.product_name
                    + '"}]'
                ),
                "response_format": '{"type":"json_object"}',
            },
            files={
                "image": ("item.jpg", io.BytesIO(request.image_bytes), "image/jpeg"),
            },
        )

        # STUB: SAM segmentation for quantity — re-verify endpoint and schema
        sam_resp = await self._client.post_multipart(
            path="/v1/segment",  # re-verify
            fields={"model": settings.META_SAM_MODEL},
            files={
                "image": ("item.jpg", io.BytesIO(request.image_bytes), "image/jpeg"),
            },
        )

        latency_ms = int((time.monotonic() - t0) * 1000)

        dimensions = _parse_quality_dimensions(quality_resp)
        quantity = _parse_quantity_estimate(sam_resp, request.expected_unit)

        return QualityAssessmentResponse(
            dimensions=dimensions,
            quantity_estimate=quantity,
            provider="meta",
            model_id=settings.META_MUSE_SPARK_MODEL,
            latency_ms=latency_ms,
            # Safe telemetry: token counts only, no content
            usage_metadata={
                "prompt_tokens": quality_resp.get("usage", {}).get("prompt_tokens"),
                "completion_tokens": quality_resp.get("usage", {}).get("completion_tokens"),
            } if not settings.AI_LOG_CONTENT else None,
        )


def _parse_quality_dimensions(response: dict) -> list[QualityDimensionResult]:
    """Parse Muse Spark structured output. Re-verify schema against actual API."""
    try:
        content = response["choices"][0]["message"]["content"]
        import json
        data = json.loads(content)
        results = []
        for dim in QualityDimension:
            if str(dim) in data:
                item = data[str(dim)]
                results.append(QualityDimensionResult(
                    dimension=dim,
                    result=item.get("result", "watch"),
                    confidence=float(item.get("confidence", 0.5)),
                    notes=item.get("notes"),
                ))
        return results
    except Exception:
        logger.exception("quality_parse_failed")
        return []


def _parse_quantity_estimate(response: dict, unit: str) -> QuantityEstimate:
    """Parse SAM segmentation output.

    SAM does NOT assess freshness or spoilage.
    If crate not fully visible, estimated_quantity is None.
    """
    try:
        fully_visible = response.get("fully_visible", False)
        raw_qty = response.get("estimated_quantity")
        return QuantityEstimate(
            estimated_quantity=Decimal(str(raw_qty)) if raw_qty is not None and fully_visible else None,
            unit=unit,
            confidence=float(response.get("confidence", 0.5)),
            crate_fully_visible=fully_visible,
        )
    except Exception:
        logger.exception("quantity_parse_failed")
        return QuantityEstimate(
            estimated_quantity=None,
            unit=unit,
            confidence=0.0,
            crate_fully_visible=False,
        )
