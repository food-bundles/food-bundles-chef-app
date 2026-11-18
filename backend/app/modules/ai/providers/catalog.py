"""Model tiers, per-model capabilities, prices and wire-schema preparation.

Everything model-specific is read from settings; feature code only names a tier.
"""

from __future__ import annotations

import copy
from typing import Any

from app.core.config import settings
from app.modules.ai.providers.base import Tier, Usage

_DEFAULT_CAPS = {"supports_temperature": False, "supports_effort": False}
_CHEAPER = {"advanced": "standard", "standard": "fast", "fast": "fast"}


def anthropic_model(tier: Tier) -> str:
    return {
        "fast": settings.ANTHROPIC_MODEL_FAST,
        "standard": settings.ANTHROPIC_MODEL_STANDARD,
        "advanced": settings.ANTHROPIC_MODEL_ADVANCED,
    }[tier]


def cheaper_tier(tier: Tier) -> Tier:
    return _CHEAPER[tier]  # type: ignore[return-value]


def capabilities(model: str) -> dict[str, bool]:
    """Conservative by default: an unknown model gets no temperature and no effort."""
    caps = settings.AI_MODEL_CAPABILITIES.get(model) or {}
    return {**_DEFAULT_CAPS, **caps}


def cost_usd(model: str, usage: Usage) -> float:
    """Cost of one call from the configured price map (USD per million tokens)."""
    price = settings.AI_MODEL_PRICES.get(model)
    if not price:
        return 0.0
    total = (
        usage.input_tokens * price.get("input", 0.0)
        + usage.output_tokens * price.get("output", 0.0)
        + usage.cached_tokens * price.get("cache_read", 0.0)
        + usage.cache_write_tokens * price.get("cache_write", 0.0)
    )
    return round(total / 1_000_000, 6)


# ── JSON schema for structured outputs ─────────────────────────────────────────
# Unsupported keywords make the API return 400 (no failover), so they are removed
# here; the server still validates the answer against the full Pydantic model.

_UNSUPPORTED = {
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "minLength",
    "maxLength",
    "pattern",
    "maxItems",
    "uniqueItems",
    "minProperties",
    "maxProperties",
    "title",
}
_FORMATS = {
    "date-time",
    "time",
    "date",
    "duration",
    "email",
    "hostname",
    "uri",
    "ipv4",
    "ipv6",
    "uuid",
}


def _clean(node: Any) -> Any:
    if isinstance(node, list):
        return [_clean(item) for item in node]
    if not isinstance(node, dict):
        return node
    out: dict[str, Any] = {}
    for key, value in node.items():
        if key in _UNSUPPORTED:
            continue
        if key == "minItems" and isinstance(value, int) and value > 1:
            continue
        if key == "format" and value not in _FORMATS:
            continue
        if key in ("properties", "$defs", "definitions") and isinstance(value, dict):
            out[key] = {name: _clean(sub) for name, sub in value.items()}
        else:
            out[key] = _clean(value)
    if out.get("type") == "object" or "properties" in out:
        out["additionalProperties"] = False
    return out


def wire_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """A copy of `schema` limited to the JSON Schema subset structured outputs accept."""
    return _clean(copy.deepcopy(schema))
