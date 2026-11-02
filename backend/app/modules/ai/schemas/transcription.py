"""Schemas for Muse Voice Transcribe (speech-to-text only)."""
from __future__ import annotations

from pydantic import BaseModel, Field


class TranscriptionRequest(BaseModel):
    audio_bytes: bytes
    language: str = "rw"  # Kinyarwanda default


class TranscriptionResponse(BaseModel):
    """Text transcription for optional chef dictation.

    This is speech-to-text only. Transcribed text goes to a form field
    for chef review; it does not directly submit any record.
    """
    text: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    provider: str
    model_id: str
    latency_ms: int | None = None
    usage_metadata: dict | None = None
