from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.modules.authentication.models import OtpChallenge
    from app.modules.kitchens.models import Kitchen


class Chef(Base):
    __tablename__ = "chefs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(254), unique=True)
    preferred_locale: Mapped[str] = mapped_column(String(5), default="en")
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    tin: Mapped[str | None] = mapped_column(String(50), nullable=True)
    restaurant_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    restaurant_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expo_push_token: Mapped[str | None] = mapped_column(String(300), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    kitchens: Mapped[list[Kitchen]] = relationship("Kitchen", back_populates="chef", lazy="noload")
    otp_challenges: Mapped[list[OtpChallenge]] = relationship(
        "OtpChallenge", back_populates="chef", lazy="noload"
    )
