"""AI capability endpoints — all kitchen-scoped.

The quality-assess and transcribe endpoints are advisory only (chef confirms before any write).
The agent endpoint plans actions and returns proposals; the chef confirms each one on mobile
before the actual API endpoint is called. The agent never writes to the database directly.

All endpoints return 503 when the capability is disabled.
AI_LOG_CONTENT=False — raw media, prompts and responses are never written to logs.
"""
from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AiDisabledError, AiProviderError
from app.modules.ai.agent_service import AgentService
from app.modules.ai.routing.provider_router import (
    AICapabilityDisabledError,
    get_quality_assessment_adapter,
    get_transcription_adapter,
)
from app.modules.ai.schemas.agent import AgentRequest, AgentResponse
from app.modules.ai.schemas.quality_assessment import (
    QualityAssessmentRequest,
    QualityAssessmentResponse,
)
from app.modules.ai.schemas.transcription import (
    TranscriptionRequest,
    TranscriptionResponse,
)
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.kitchens.service import KitchenService

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/kitchens/{kitchen_id}/ai", tags=["ai"])


async def _get_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
):
    svc = KitchenService(db)
    return await svc.get_kitchen(current_chef, kitchen_id)


@router.post("/quality-assess", response_model=QualityAssessmentResponse)
async def assess_quality(
    product_name: str = Form(...),
    expected_unit: str = Form(...),
    image: UploadFile = File(..., description="JPEG or PNG, max 1 MB"),
    kitchen=Depends(_get_kitchen),
) -> QualityAssessmentResponse:
    """Advisory quality assessment for a delivery item photo.

    Returns quality dimension results and an optional quantity estimate.
    The chef must confirm all values — AI output does not create any record.
    Returns 503 when AI capabilities are disabled; mobile falls back to manual entry.
    """
    image_bytes = await image.read()
    if len(image_bytes) > settings.AI_MAX_IMAGE_SIZE_BYTES:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds {settings.AI_MAX_IMAGE_SIZE_BYTES} bytes limit.",
        )

    try:
        adapter = get_quality_assessment_adapter()
    except AICapabilityDisabledError:
        raise AiDisabledError("Quality assessment is not enabled.")

    try:
        result = await adapter.assess(
            QualityAssessmentRequest(
                image_bytes=image_bytes,
                product_name=product_name,
                expected_unit=expected_unit,
            )
        )
    except Exception as exc:
        logger.warning(
            "quality_assessment_failed",
            kitchen_id=str(kitchen.id),
            # No product name or image content logged
        )
        raise AiProviderError(f"Quality assessment failed: {type(exc).__name__}") from exc

    logger.info(
        "quality_assessment_complete",
        kitchen_id=str(kitchen.id),
        provider=result.provider,
        latency_ms=result.latency_ms,
    )
    return result


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    language: str = Form(default="rw"),
    audio: UploadFile = File(..., description="WAV or M4A audio file"),
    kitchen=Depends(_get_kitchen),
) -> TranscriptionResponse:
    """Speech-to-text for optional chef dictation.

    Transcribed text is returned to the mobile form field for chef review.
    The chef must submit the form — transcription does not create any record.
    Returns 503 when AI capabilities are disabled.
    """
    audio_bytes = await audio.read()

    try:
        adapter = get_transcription_adapter()
    except AICapabilityDisabledError:
        raise AiDisabledError("Transcription is not enabled.")

    try:
        result = await adapter.transcribe(
            TranscriptionRequest(audio_bytes=audio_bytes, language=language)
        )
    except Exception as exc:
        logger.warning(
            "transcription_failed",
            kitchen_id=str(kitchen.id),
            # No audio content logged (AI_LOG_CONTENT=False)
        )
        raise AiProviderError(f"Transcription failed: {type(exc).__name__}") from exc

    logger.info(
        "transcription_complete",
        kitchen_id=str(kitchen.id),
        provider=result.provider,
        latency_ms=result.latency_ms,
    )
    return result


@router.post("/agent", response_model=AgentResponse)
async def agent_turn(
    body: AgentRequest,
    kitchen=Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> AgentResponse:
    """Conversational AI agent — plans actions on behalf of the chef.

    The agent reads kitchen context (stock, orders, menu) and the conversation
    history, then returns either a clarifying question or an ActionProposal.

    The chef confirms the proposal on mobile; the real mutation endpoint is then
    called by the mobile app. This endpoint NEVER writes to the database.

    Returns 503 when AI_AGENT_ENABLED=False.
    """
    chef_name = current_chef.name or current_chef.phone_number

    svc = AgentService(db)
    try:
        result = await svc.run(kitchen=kitchen, chef_name=chef_name, request=body)
    except AiDisabledError:
        raise
    except AiProviderError:
        raise
    except Exception as exc:
        logger.warning(
            "agent_turn_failed",
            kitchen_id=str(kitchen.id),
            # No message content logged (AI_LOG_CONTENT=False)
        )
        raise AiProviderError(f"Agent turn failed: {type(exc).__name__}") from exc

    logger.info("agent_turn_complete", kitchen_id=str(kitchen.id))
    return result
