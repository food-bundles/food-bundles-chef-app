"""Meta Muse Voice Transcribe adapter (speech-to-text only).

IMPORTANT: Re-verify before use:
  - Endpoint at https://dev.meta.ai/docs/speech-to-text
  - Model ID in settings.META_MUSE_VOICE_MODEL
  - Supported languages and audio formats
  - Max audio size and duration limits

Constraints:
  - Speech-to-text ONLY — transcribed text goes to form field for chef review
  - Chef confirms before any record is created from transcribed text
  - No raw audio content logged (AI_LOG_CONTENT must be False)
"""
from __future__ import annotations

import io
import time

import structlog

from app.core.config import settings
from app.integrations.meta_model_api.client import MetaModelAPIClient
from app.modules.ai.schemas.transcription import (
    TranscriptionRequest,
    TranscriptionResponse,
)

logger = structlog.get_logger(__name__)


class MetaTranscriptionAdapter:
    """UNVERIFIED STUB — re-verify endpoint and payload schema against
    https://dev.meta.ai/docs/speech-to-text before enabling in production.
    """

    def __init__(self) -> None:
        self._client = MetaModelAPIClient()

    async def transcribe(
        self, request: TranscriptionRequest
    ) -> TranscriptionResponse:
        t0 = time.monotonic()

        # STUB: re-verify endpoint path and field names against official docs
        response = await self._client.post_multipart(
            path="/audio/transcriptions",  # re-verify — base URL already includes /v1
            fields={
                "model": settings.META_MUSE_VOICE_MODEL,
                "language": request.language,
                "response_format": "json",
            },
            files={
                "file": ("audio.wav", io.BytesIO(request.audio_bytes), "audio/wav"),
            },
        )

        latency_ms = int((time.monotonic() - t0) * 1000)

        return TranscriptionResponse(
            text=response.get("text", ""),
            confidence=float(response.get("confidence", 0.5)),
            provider="meta",
            model_id=settings.META_MUSE_VOICE_MODEL,
            latency_ms=latency_ms,
            usage_metadata={
                "duration_seconds": response.get("duration"),
            } if not settings.AI_LOG_CONTENT else None,
        )
