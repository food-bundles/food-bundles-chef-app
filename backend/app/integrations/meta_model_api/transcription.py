"""Meta Muse Voice Transcribe adapter — speech-to-text via /audio/transcriptions.

Sends audio as multipart/form-data. The transcribed text is returned to the
mobile form field for chef review — it does not create any record directly.

Constraints:
- Speech-to-text ONLY; chef confirms before any record is written
- No raw audio content logged (AI_LOG_CONTENT must be False)
- Supported formats: wav, m4a, mp3, ogg (re-verify at dev.meta.ai/docs)
"""
from __future__ import annotations

import io
import mimetypes
import time

import structlog

from app.core.config import settings
from app.integrations.meta_model_api.client import MetaModelAPIClient
from app.modules.ai.schemas.transcription import (
    TranscriptionRequest,
    TranscriptionResponse,
)

logger = structlog.get_logger(__name__)

_AUDIO_MIME: dict[str, str] = {
    "wav": "audio/wav",
    "m4a": "audio/mp4",
    "mp3": "audio/mpeg",
    "ogg": "audio/ogg",
    "webm": "audio/webm",
}


class MetaTranscriptionAdapter:
    """Muse Voice Transcribe via POST /audio/transcriptions (multipart)."""

    def __init__(self) -> None:
        self._client = MetaModelAPIClient()

    async def transcribe(self, request: TranscriptionRequest) -> TranscriptionResponse:
        t0 = time.monotonic()

        # Detect format from magic bytes; default to wav
        fmt = _detect_audio_format(request.audio_bytes)
        mime = _AUDIO_MIME.get(fmt, "audio/wav")
        filename = f"audio.{fmt}"

        response = await self._client.post_multipart(
            path="/audio/transcriptions",
            fields={
                "model": settings.META_MUSE_VOICE_MODEL,
                "language": request.language,
                "response_format": "json",
            },
            files={
                "file": (filename, io.BytesIO(request.audio_bytes), mime),
            },
        )

        latency_ms = int((time.monotonic() - t0) * 1000)
        text = response.get("text") or ""
        confidence = float(response.get("confidence", 0.8))

        logger.info(
            "transcription_complete",
            provider="meta",
            latency_ms=latency_ms,
            # No transcript text logged (AI_LOG_CONTENT=False)
        )

        return TranscriptionResponse(
            text=text,
            confidence=confidence,
            provider="meta",
            model_id=settings.META_MUSE_VOICE_MODEL,
            latency_ms=latency_ms,
            usage_metadata=None,
        )


def _detect_audio_format(data: bytes) -> str:
    """Identify audio format from magic bytes."""
    if data[:4] == b"RIFF":
        return "wav"
    if data[:4] == b"fLaC":
        return "flac"
    if data[:3] == b"ID3" or (len(data) > 1 and data[0] == 0xFF and data[1] & 0xE0 == 0xE0):
        return "mp3"
    if data[4:8] in (b"ftyp", b"moov") or data[:4] == b"\x00\x00\x00\x20":
        return "m4a"
    if data[:4] == b"OggS":
        return "ogg"
    if data[:4] == b"\x1aE\xdf\xa3":
        return "webm"
    return "wav"
