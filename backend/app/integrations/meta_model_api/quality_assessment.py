"""Meta Muse Spark quality assessment adapter — uses multimodal chat API.

Sends the delivery photo as a base64 image_url in the chat messages array.
Muse Spark returns a JSON object with quality dimensions and an optional
quantity estimate. SAM 3.1 segmentation is not used here — Muse Spark's
vision capability covers both quality dims and visible-quantity estimation.

Constraints:
- Chef measurement and decision always wins over AI output
- Muse Image output is never delivery evidence
- If crate not fully visible, quantity_estimate.estimated_quantity = None
- No raw image content is logged (AI_LOG_CONTENT must be False)
"""

from __future__ import annotations

import json
import time
from decimal import Decimal, InvalidOperation

import structlog

from app.core.config import settings
from app.modules.ai.schemas.quality_assessment import (
    QualityAssessmentRequest,
    QualityAssessmentResponse,
    QualityDimension,
    QualityDimensionResult,
    QuantityEstimate,
)

logger = structlog.get_logger(__name__)

_QUALITY_SYSTEM_PROMPT = """You are a food delivery quality assessor.
Inspect the image of the food item and return ONLY a raw JSON object with no markdown or code fences.

JSON format:
{
  "freshness": {"result": "pass|watch|fail", "confidence": 0.0-1.0, "notes": "optional"},
  "ripeness": {"result": "pass|watch|fail", "confidence": 0.0-1.0, "notes": "optional"},
  "damage": {"result": "pass|watch|fail", "confidence": 0.0-1.0, "notes": "optional"},
  "spoilage": {"result": "pass|watch|fail", "confidence": 0.0-1.0, "notes": "optional"},
  "size_grade": {"result": "pass|watch|fail", "confidence": 0.0-1.0, "notes": "optional"},
  "foreign_matter": {"result": "pass|watch|fail", "confidence": 0.0-1.0, "notes": "optional"},
  "quantity_visible": true|false,
  "estimated_quantity": <number or null>
}

Rules:
- Use "pass" for good, "watch" for borderline, "fail" for clearly bad
- estimated_quantity: only set if the full container/crate is visible. null otherwise
- This is advisory only — the chef makes the final decision
"""


class MetaQualityAssessmentAdapter:
    """Muse Spark multimodal quality assessment via /chat/completions with base64 image."""

    async def assess(
        self,
        request: QualityAssessmentRequest,
        *,
        kitchen_id: str = "",
        request_id: str = "",
    ) -> QualityAssessmentResponse:
        """Routed through the provider router with a meta-only policy (Phase 8):
        same prompt, model, image format and parsing as before, plus the router's
        time budget, kill switch, cost tracking and `ai_call` logging.
        """
        from app.modules.ai.providers.base import ImagePart, LLMRequest, Message
        from app.modules.ai.providers.router import provider_router

        t0 = time.monotonic()

        if len(request.image_bytes) > settings.AI_MAX_IMAGE_SIZE_BYTES:
            raise ValueError(
                f"Image exceeds {settings.AI_MAX_IMAGE_SIZE_BYTES} bytes. "
                "Resize to ≤ 1 MB before sending."
            )

        text = (
            f"Assess this delivery item: {request.product_name} "
            f"(expected unit: {request.expected_unit})"
        )
        routed = await provider_router.run(
            LLMRequest(
                feature="quality_assessment",
                prompt_version="quality_assessment.inline",
                systems={"meta": _QUALITY_SYSTEM_PROMPT},
                messages=[
                    Message(role="user", parts=(ImagePart(request.image_bytes, "image/jpeg"), text))
                ],
                request_id=request_id,
                kitchen_id=kitchen_id,
                max_tokens=1024,
                meta_model=settings.META_MUSE_SPARK_MODEL,
            ),
            # Tolerant parsing, as before: an unreadable answer yields no dimensions.
            parse=lambda raw: _parse_response(raw, request.expected_unit),
            budget_seconds=settings.AI_DEFAULT_TIMEOUT_SECONDS,
            policy="meta_only",
        )
        dimensions, quantity = routed.value
        return QualityAssessmentResponse(
            dimensions=dimensions,
            quantity_estimate=quantity,
            provider=routed.provider,
            model_id=routed.model,
            input_tokens=routed.usage.input_tokens,
            output_tokens=routed.usage.output_tokens,
            latency_ms=int((time.monotonic() - t0) * 1000),
            usage_metadata=None,
        )


def _parse_response(raw: str, unit: str) -> tuple[list[QualityDimensionResult], QuantityEstimate]:
    """Extract JSON from the model response, tolerating preamble or fences."""
    import re

    # strip fences
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fenced:
        raw = fenced.group(1)
    else:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start != -1 and end > start:
            raw = raw[start:end]

    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        logger.warning("quality_assessment_parse_failed", raw_length=len(raw))
        return [], QuantityEstimate(
            estimated_quantity=None, unit=unit, confidence=0.0, crate_fully_visible=False
        )

    dim_names = [d.value for d in QualityDimension]
    dimensions: list[QualityDimensionResult] = []
    for name in dim_names:
        item = data.get(name)
        if isinstance(item, dict):
            result = str(item.get("result", "watch"))
            if result not in ("pass", "watch", "fail"):
                result = "watch"
            dimensions.append(
                QualityDimensionResult(
                    dimension=QualityDimension(name),
                    result=result,
                    confidence=float(item.get("confidence", 0.5)),
                    notes=item.get("notes") or None,
                )
            )

    qty_visible = bool(data.get("quantity_visible", False))
    raw_qty = data.get("estimated_quantity")
    try:
        estimated = Decimal(str(raw_qty)) if raw_qty is not None and qty_visible else None
    except InvalidOperation:
        estimated = None

    quantity = QuantityEstimate(
        estimated_quantity=estimated,
        unit=unit,
        confidence=0.7 if estimated is not None else 0.0,
        crate_fully_visible=qty_visible,
    )

    return dimensions, quantity
