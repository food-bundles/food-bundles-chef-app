"""AI feature flags — all off by default (AI004).

All AI capabilities are opt-in. Enabling them requires:
1. AI_ENABLED = True in settings (global kill switch)
2. The specific capability flag set to True
3. Per-kitchen limits not exceeded (enforced by registry)

Never enable any capability in production without:
- Verified Meta Model API terms and data-use review
- Legal review for Rwanda data protection obligations
- Human-reviewed eval dataset with quality/cost/latency thresholds
"""
from __future__ import annotations

from app.core.config import settings


def quality_assessment_enabled() -> bool:
    return settings.AI_ENABLED and settings.AI_QUALITY_ASSESSMENT_ENABLED


def transcription_enabled() -> bool:
    return settings.AI_ENABLED and settings.AI_TRANSCRIPTION_ENABLED
