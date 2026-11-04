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

import base64
import json
import time
from decimal import Decimal, InvalidOperation

import structlog

from app.core.config import settings
from app.integrations.meta_model_api.client import MetaModelAPIClient, MetaModelAPIError
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

    def __init__(self) -> None:
        self._client = MetaModelAPIClient()

    async def assess(self, request: QualityAssessmentRequest) -> QualityAssessmentResponse:
        t0 = time.monotonic()

        if len(request.image_bytes) > settings.AI_MAX_IMAGE_SIZE_BYTES:
            raise ValueError(
                f"Image exceeds {settings.AI_MAX_IMAGE_SIZE_BYTES} bytes. "
                "Resize to ≤ 1 MB before sending."
            )

        b64 = base64.b64encode(request.image_bytes).decode("utf-8")
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                    },
                    {
                        "type": "text",
                        "text": f"Assess this delivery item: {request.product_name} (expected unit: {request.expected_unit})",
                    },
                ],
            }
        ]

        payload = {
            "model": settings.META_MUSE_SPARK_MODEL,
            "messages": [{"role": "system", "content": _QUALITY_SYSTEM_PROMPT}] + messages,
            "max_tokens": 1024,
        }

        response = await self._client.post_json("/chat/completions", payload)
        latency_ms = int((time.monotonic() - t0) * 1000)

        raw_content = response.get("choices", [{}])[0].get("message", {}).get("content") or ""
        dimensions, quantity = _parse_response(raw_content, request.expected_unit)

        usage = response.get("usage", {})
        return QualityAssessmentResponse(
            dimensions=dimensions,
            quantity_estimate=quantity,
            provider="meta",
            model_id=settings.META_MUSE_SPARK_MODEL,
            input_tokens=usage.get("prompt_tokens"),
            output_tokens=usage.get("completion_tokens"),
            latency_ms=latency_ms,
            usage_metadata=None,
        )


def _parse_response(
    raw: str, unit: str
) -> tuple[list[QualityDimensionResult], QuantityEstimate]:
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
