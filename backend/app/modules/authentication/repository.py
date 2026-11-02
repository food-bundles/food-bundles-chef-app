from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.authentication.models import OtpChallenge, RefreshToken


class OtpRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, challenge: OtpChallenge) -> OtpChallenge:
        self._db.add(challenge)
        await self._db.flush()
        return challenge

    async def get_latest_for_phone(self, phone_number: str) -> OtpChallenge | None:
        result = await self._db.execute(
            select(OtpChallenge)
            .where(
                OtpChallenge.phone_number == phone_number,
                OtpChallenge.verified == False,
                OtpChallenge.expires_at > datetime.now(UTC),
            )
            .order_by(OtpChallenge.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_latest_any_status(self, phone_number: str) -> OtpChallenge | None:
        """Used for resend cooldown check regardless of expiry."""
        result = await self._db.execute(
            select(OtpChallenge)
            .where(OtpChallenge.phone_number == phone_number)
            .order_by(OtpChallenge.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def increment_attempts(self, challenge_id: uuid.UUID) -> None:
        await self._db.execute(
            update(OtpChallenge)
            .where(OtpChallenge.id == challenge_id)
            .values(attempts=OtpChallenge.attempts + 1)
        )

    async def mark_verified(self, challenge_id: uuid.UUID) -> None:
        await self._db.execute(
            update(OtpChallenge)
            .where(OtpChallenge.id == challenge_id)
            .values(verified=True)
        )


class RefreshTokenRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, token: RefreshToken) -> RefreshToken:
        self._db.add(token)
        await self._db.flush()
        return token

    async def get_by_jti(self, jti: str) -> RefreshToken | None:
        result = await self._db.execute(
            select(RefreshToken).where(
                RefreshToken.jti == jti,
                RefreshToken.revoked == False,
                RefreshToken.expires_at > datetime.now(UTC),
            )
        )
        return result.scalar_one_or_none()

    async def revoke(self, jti: str) -> None:
        await self._db.execute(
            update(RefreshToken)
            .where(RefreshToken.jti == jti)
            .values(revoked=True)
        )

    async def revoke_all_for_chef(self, chef_id: uuid.UUID) -> None:
        await self._db.execute(
            update(RefreshToken)
            .where(RefreshToken.chef_id == chef_id)
            .values(revoked=True)
        )
