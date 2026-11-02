from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
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
from app.modules.chefs.schemas import ChefProfileResponse

router = APIRouter(prefix="/auth", tags=["authentication"])


def _get_service(db: AsyncSession = Depends(get_db)) -> AuthenticationService:
    return AuthenticationService(db=db, sms=get_sms_provider())


@router.post("/otp/request", response_model=OtpRequestResponse, status_code=200)
async def request_otp(
    body: OtpRequestSchema,
    service: AuthenticationService = Depends(_get_service),
) -> OtpRequestResponse:
    expires_in = await service.request_otp(body.phone_number)
    return OtpRequestResponse(
        message="OTP sent successfully.",
        expires_in_seconds=expires_in,
    )


@router.post("/otp/verify", response_model=TokenResponse, status_code=200)
async def verify_otp(
    body: OtpVerifySchema,
    service: AuthenticationService = Depends(_get_service),
) -> TokenResponse:
    return await service.verify_otp_and_authenticate(body.phone_number, body.code)


@router.post("/token/refresh", response_model=TokenResponse, status_code=200)
async def refresh_token(
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
