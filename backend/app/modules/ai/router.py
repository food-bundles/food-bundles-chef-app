"""AI capability endpoints — all kitchen-scoped.

The quality-assess and transcribe endpoints are advisory only (chef confirms before any write).
The agent endpoint plans actions and returns proposals; the chef confirms each one on mobile
before the actual API endpoint is called. The agent never writes to the database directly.

All endpoints return 503 when the capability is disabled.
AI_LOG_CONTENT=False — raw media, prompts and responses are never written to logs.
"""

from __future__ import annotations

import uuid
from typing import Literal

import structlog
from fastapi import APIRouter, Depends, File, Form, Header, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AiAudioTooLargeError, AiDisabledError, AiProviderError, AppError
from app.modules.ai.agent_service import AgentService
from app.modules.ai.gateway.core import check_rate_limit, validate_image
from app.modules.ai.gateway.service import AiGatewayService, new_request_id
from app.modules.ai.registry.feature_flags import (
    assistant_enabled,
    dish_analysis_enabled,
    document_scan_enabled,
    image_classify_enabled,
    menu_scan_enabled,
    transcription_enabled,
    transcription_languages,
)
from app.modules.ai.routing.provider_router import (
    AICapabilityDisabledError,
    get_quality_assessment_adapter,
    get_transcription_adapter,
)
from app.modules.ai.schemas.agent import AgentRequest, AgentResponse
from app.modules.ai.schemas.gateway import (
    AiFeaturesResponse,
    AiFeedbackRequest,
    DishAnalysisResponse,
    DocumentExtractionResponse,
    ImageClassificationResponse,
    MenuExtractionResponse,
)
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


AppLanguage = Literal["en", "fr", "rw"]
# A 60 s push-to-talk clip (AAC, ~128 kbps) is about 1 MB; 3 MB leaves room for other codecs.
MAX_AUDIO_BYTES = 3 * 1024 * 1024


@router.get("/features", response_model=AiFeaturesResponse)
async def ai_features(kitchen=Depends(_get_kitchen)) -> AiFeaturesResponse:
    """Remote kill switches: which AI features the app may offer right now."""
    return AiFeaturesResponse(
        image_classify=image_classify_enabled(),
        menu_scan=menu_scan_enabled(),
        dish_analysis=dish_analysis_enabled(),
        document_scan=document_scan_enabled(),
        assistant=assistant_enabled(),
        transcription=transcription_enabled(),
        transcription_languages=[
            lang for lang in transcription_languages() if lang in ("en", "fr", "rw")
        ],
    )


async def _read_image(image: UploadFile) -> tuple[bytes, str]:
    data = await image.read(settings.AI_MAX_IMAGE_SIZE_BYTES + 1)
    return data, validate_image(data)


@router.post("/classify-image", response_model=ImageClassificationResponse)
async def classify_image(
    image: UploadFile = File(..., description="JPEG/PNG/WebP, ≤ 1 MiB"),
    language: AppLanguage = Form("en"),
    x_request_id: str | None = Header(default=None),
    kitchen=Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> ImageClassificationResponse:
    """Decide what a photo shows (menu, dish, receipt, delivery note, stock shelf, other)."""
    if not image_classify_enabled():
        raise AiDisabledError("Image classification is not enabled.")
    check_rate_limit(str(kitchen.id), str(current_chef.id))
    data, mime = await _read_image(image)
    return await AiGatewayService(db).classify(kitchen, data, mime, new_request_id(x_request_id))


@router.post("/menu-extract", response_model=MenuExtractionResponse)
async def menu_extract(
    image: UploadFile = File(..., description="JPEG/PNG/WebP, ≤ 1 MiB"),
    language: AppLanguage = Form("en"),
    x_request_id: str | None = Header(default=None),
    kitchen=Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> MenuExtractionResponse:
    """Extract menu items for chef review. Nothing is saved — the app imports confirmed rows."""
    if not menu_scan_enabled():
        raise AiDisabledError("Menu scanning is not enabled.")
    check_rate_limit(str(kitchen.id), str(current_chef.id))
    data, mime = await _read_image(image)
    return await AiGatewayService(db).extract_menu(
        kitchen, data, mime, language, new_request_id(x_request_id)
    )


@router.post("/dish-analyze", response_model=DishAnalysisResponse)
async def dish_analyze(
    image: UploadFile = File(..., description="JPEG/PNG/WebP, ≤ 1 MiB"),
    language: AppLanguage = Form("en"),
    name_hint: str | None = Form(default=None, max_length=120),
    x_request_id: str | None = Header(default=None),
    kitchen=Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> DishAnalysisResponse:
    """Suggest dish name, category and ingredients; price range is computed from real costs."""
    if not dish_analysis_enabled():
        raise AiDisabledError("Dish analysis is not enabled.")
    check_rate_limit(str(kitchen.id), str(current_chef.id))
    data, mime = await _read_image(image)
    return await AiGatewayService(db).analyze_dish(
        kitchen, data, mime, language, name_hint, new_request_id(x_request_id)
    )


@router.post("/document-extract", response_model=DocumentExtractionResponse)
async def document_extract(
    image: UploadFile = File(..., description="JPEG/PNG/WebP, ≤ 1 MiB"),
    language: AppLanguage = Form("en"),
    x_request_id: str | None = Header(default=None),
    kitchen=Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> DocumentExtractionResponse:
    """Read line items from a delivery note or receipt. Nothing is saved — the chef
    reviews the lines in Log Delivery and confirms them there."""
    if not document_scan_enabled():
        raise AiDisabledError("Document scanning is not enabled.")
    check_rate_limit(str(kitchen.id), str(current_chef.id))
    data, mime = await _read_image(image)
    return await AiGatewayService(db).extract_document(
        kitchen, data, mime, language, new_request_id(x_request_id)
    )


@router.post("/feedback", status_code=204)
async def ai_feedback(
    body: AiFeedbackRequest,
    kitchen=Depends(_get_kitchen),
) -> Response:
    """Record what the chef did with an AI result (confirmed, edited, rejected, imported).

    Joined with the `ai_call` log by request_id for quality dashboards. Carries no
    prompt, image, audio or free text — only ids, the outcome and optional counts.
    """
    logger.info(
        "ai_feedback",
        request_id=body.request_id,
        feature=body.feature,
        outcome=body.outcome,
        accepted=body.accepted,
        suggested=body.suggested,
        kitchen_id=str(kitchen.id),
    )
    return Response(status_code=204)


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
        raise AiDisabledError("Quality assessment is not enabled.") from None

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
    current_chef: Chef = Depends(get_current_chef),
) -> TranscriptionResponse:
    """Speech-to-text for optional chef dictation.

    Transcribed text is returned to the mobile form field for chef review.
    The chef must submit the form — transcription does not create any record.
    Returns 503 when AI capabilities are disabled.
    """
    if not transcription_enabled():
        raise AiDisabledError("Transcription is not enabled.")
    # Never send audio in a language the STT provider has not been evaluated for
    # (e.g. Kinyarwanda to an English-only model).
    if language not in transcription_languages():
        raise AiDisabledError(f"Voice input is not available for '{language}' yet.")
    check_rate_limit(str(kitchen.id), str(current_chef.id))
    # 60 s of AAC voice is well under 2 MB; anything larger is not a push-to-talk clip.
    audio_bytes = await audio.read(MAX_AUDIO_BYTES + 1)
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise AiAudioTooLargeError()

    try:
        adapter = get_transcription_adapter()
    except AICapabilityDisabledError:
        raise AiDisabledError("Transcription is not enabled.") from None

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
    x_request_id: str | None = Header(default=None),
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
    # Never send the phone number to the model; it is not needed to plan kitchen actions.
    chef_name = current_chef.name or "Chef"

    svc = AgentService(db)
    try:
        result = await svc.run(
            kitchen=kitchen,
            chef_name=chef_name,
            chef_id=str(current_chef.id),
            request=body,
            request_id=new_request_id(x_request_id),
        )
    except AppError:
        # Typed errors (disabled, timeout, bad output, rate limit, image) keep their status codes.
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
