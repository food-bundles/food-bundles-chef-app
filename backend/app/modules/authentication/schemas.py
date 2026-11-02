from __future__ import annotations

from pydantic import BaseModel, Field


class OtpRequestSchema(BaseModel):
    phone_number: str = Field(..., min_length=7, max_length=20)


class OtpVerifySchema(BaseModel):
    phone_number: str = Field(..., min_length=7, max_length=20)
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class OtpRequestResponse(BaseModel):
    message: str
    expires_in_seconds: int
