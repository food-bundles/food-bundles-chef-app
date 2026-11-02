from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import AUTH_LIMIT, OTP_REQUEST_LIMIT, OTP_VERIFY_LIMIT, limiter
from app.integrations.sms.factory import get_sms_provider
from app.modules.authentication.dependencies import get_current_chef
from app.modules.authentication.schemas import (
    OtpRequestResponse,
    OtpRequestSchema,
    OtpVerifySchema,
    RefreshRequest,
    TokenResponse,
)
from app.modules.authentication.service import AuthenticationService
from app.modules.chefs.models import Chef
from app.modules.chefs.repository import ChefRepository
from app.modules.chefs.schemas import ChefProfileResponse, PushTokenRequest

router = APIRouter(prefix="/auth", tags=["authentication"])


def _get_service(db: AsyncSession = Depends(get_db)) -> AuthenticationService:
    return AuthenticationService(db=db, sms=get_sms_provider())


@router.post("/otp/request", response_model=OtpRequestResponse, status_code=200)
@limiter.limit(OTP_REQUEST_LIMIT)
async def request_otp(
    request: Request,
    body: OtpRequestSchema,
    service: AuthenticationService = Depends(_get_service),
) -> OtpRequestResponse:
    expires_in = await service.request_otp(body.phone_number)
    return OtpRequestResponse(
        message="OTP sent successfully.",
        expires_in_seconds=expires_in,
    )


@router.post("/otp/verify", response_model=TokenResponse, status_code=200)
@limiter.limit(OTP_VERIFY_LIMIT)
async def verify_otp(
    request: Request,
    body: OtpVerifySchema,
    service: AuthenticationService = Depends(_get_service),
) -> TokenResponse:
    return await service.verify_otp_and_authenticate(body.phone_number, body.code)


@router.post("/token/refresh", response_model=TokenResponse, status_code=200)
@limiter.limit(AUTH_LIMIT)
async def refresh_token(
    request: Request,
    body: RefreshRequest,
    service: AuthenticationService = Depends(_get_service),
) -> TokenResponse:
    return await service.refresh_tokens(body.refresh_token)


@router.post("/logout", status_code=200)
async def logout(
    body: RefreshRequest,
    service: AuthenticationService = Depends(_get_service),
) -> dict:
    await service.logout(body.refresh_token)
    return {"message": "Logged out."}


@router.get("/me", response_model=ChefProfileResponse)
async def get_me(
    current_chef: Chef = Depends(get_current_chef),
) -> ChefProfileResponse:
    return ChefProfileResponse.model_validate(current_chef)


@router.put("/me/push-token", status_code=200)
async def register_push_token(
    body: PushTokenRequest,
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Register or update the Expo push token for the authenticated chef."""
    current_chef.expo_push_token = body.token
    repo = ChefRepository(db)
    await repo.update(current_chef)
    return {"message": "Push token registered."}
