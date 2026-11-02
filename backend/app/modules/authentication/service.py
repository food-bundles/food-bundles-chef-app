from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    OtpExpiredError,
    OtpMaxAttemptsError,
    OtpResendCooldownError,
    UnauthorizedError,
)
from app.core.security import (
    TOKEN_TYPE_REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    hash_password,
    verify_password,
)
from app.integrations.sms.base import SmsProvider
from app.modules.audit.service import AuditService
from app.modules.authentication.models import OtpChallenge, RefreshToken
from app.modules.authentication.repository import OtpRepository, RefreshTokenRepository
from app.modules.authentication.schemas import TokenResponse
from app.modules.chefs.models import Chef
from app.modules.chefs.repository import ChefRepository
from app.shared.enums import AuditEventType


class AuthenticationService:
    def __init__(
        self,
        db: AsyncSession,
        sms: SmsProvider,
    ) -> None:
        self._db = db
        self._sms = sms
        self._otp_repo = OtpRepository(db)
        self._token_repo = RefreshTokenRepository(db)
        self._chef_repo = ChefRepository(db)

    async def request_otp(self, phone_number: str) -> int:
        """Send an OTP to the given phone. Returns seconds until expiry."""
        last = await self._otp_repo.get_latest_any_status(phone_number)
        if last is not None:
            created = last.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=UTC)
            cooldown_boundary = created + timedelta(
                seconds=settings.OTP_RESEND_COOLDOWN_SECONDS
            )
            if datetime.now(UTC) < cooldown_boundary:
                raise OtpResendCooldownError()

        code = settings.MOCK_OTP_CODE if settings.MOCK_OTP_CODE else generate_otp()
        hashed = hash_password(code)

        challenge = OtpChallenge(
            phone_number=phone_number,
            hashed_code=hashed,
            expires_at=datetime.now(UTC) + timedelta(seconds=settings.OTP_EXPIRY_SECONDS),
        )
        await self._otp_repo.create(challenge)
        await self._sms.send_otp(phone_number, code)
        await AuditService(self._db).record(
            AuditEventType.AUTH_OTP_REQUESTED,
            details={"phone_suffix": phone_number[-4:]},
        )
        return settings.OTP_EXPIRY_SECONDS

    async def verify_otp_and_authenticate(
        self, phone_number: str, code: str
    ) -> TokenResponse:
        """Verify OTP, upsert Chef, return JWT pair."""
        challenge = await self._otp_repo.get_latest_for_phone(phone_number)
        if challenge is None:
            raise OtpExpiredError()

        if challenge.attempts >= settings.OTP_MAX_ATTEMPTS:
            raise OtpMaxAttemptsError()

        await self._otp_repo.increment_attempts(challenge.id)

        if not verify_password(code, challenge.hashed_code):
            remaining = settings.OTP_MAX_ATTEMPTS - (challenge.attempts + 1)
            if remaining <= 0:
                raise OtpMaxAttemptsError()
            raise OtpExpiredError(f"Invalid code. {remaining} attempt(s) remaining.")

        await self._otp_repo.mark_verified(challenge.id)

        chef = await self._chef_repo.get_by_phone(phone_number)
        if chef is None:
            chef = Chef(phone_number=phone_number)
            self._db.add(chef)
            await self._db.flush()

        await AuditService(self._db).record(
            AuditEventType.AUTH_LOGIN,
            actor_id=chef.id,
            details={"phone_suffix": phone_number[-4:]},
        )
        return await self._issue_token_pair(chef)

    async def refresh_tokens(self, raw_refresh_token: str) -> TokenResponse:
        payload = decode_token(raw_refresh_token, expected_type=TOKEN_TYPE_REFRESH)
        jti = payload.get("jti")
        if not jti:
            raise UnauthorizedError("Refresh token missing jti.")

        stored = await self._token_repo.get_by_jti(jti)
        if stored is None:
            raise UnauthorizedError("Refresh token not found or revoked.")

        await self._token_repo.revoke(jti)

        chef = await self._chef_repo.get_by_id(stored.chef_id)
        if chef is None:
            raise UnauthorizedError("Chef not found.")

        await AuditService(self._db).record(
            AuditEventType.AUTH_TOKEN_REFRESHED,
            actor_id=chef.id,
        )
        return await self._issue_token_pair(chef)

    async def logout(self, raw_refresh_token: str) -> None:
        try:
            payload = decode_token(raw_refresh_token, expected_type=TOKEN_TYPE_REFRESH)
        except UnauthorizedError:
            return  # already invalid; silently ignore

        jti = payload.get("jti")
        if jti:
            await self._token_repo.revoke(jti)

    async def _issue_token_pair(self, chef: Chef) -> TokenResponse:
        chef_id_str = str(chef.id)
        access = create_access_token(chef_id_str)

        raw_refresh = create_refresh_token(chef_id_str)
        refresh_payload = decode_token(raw_refresh, expected_type=TOKEN_TYPE_REFRESH)
        jti = refresh_payload["jti"]

        expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        stored_token = RefreshToken(
            jti=jti,
            chef_id=chef.id,
            expires_at=expires_at,
        )
        await self._token_repo.create(stored_token)

        return TokenResponse(access_token=access, refresh_token=raw_refresh)
