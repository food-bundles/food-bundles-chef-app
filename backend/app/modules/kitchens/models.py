from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.shared.enums import KitchenStatus

if TYPE_CHECKING:
    from app.modules.chefs.models import Chef


class Kitchen(Base):
    __tablename__ = "kitchens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chef_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chefs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    location: Mapped[str | None] = mapped_column(String(300))
    address: Mapped[str | None] = mapped_column(String(500))
    phone: Mapped[str | None] = mapped_column(String(20))
    # ISO 4217, chosen at setup; changed only through the convert / relabel flow.
    currency: Mapped[str] = mapped_column(String(3))
    # IANA zone, chosen at setup (required by the API; no country default is assumed).
    timezone: Mapped[str] = mapped_column(String(50))
    # ISO 3166-1 alpha-2. Decides catalogue availability (FOOD_BUNDLES_COUNTRIES).
    country: Mapped[str | None] = mapped_column(String(2))
    status: Mapped[str] = mapped_column(String(20), default=KitchenStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @property
    def catalog_available(self) -> bool:
        """Food Bundles catalogue and catalogue requisitions are offered here."""
        from app.core.config import settings

        return bool(self.country) and self.country in settings.FOOD_BUNDLES_COUNTRIES

    chef: Mapped[Chef] = relationship("Chef", back_populates="kitchens", lazy="noload")
