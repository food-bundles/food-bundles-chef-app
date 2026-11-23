"""Applied offline operations (Phase 9): a retried sync never applies the same one twice."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SyncOperation(Base):
    __tablename__ = "sync_operations"

    # The mobile queue's id for the mutation (operation_id).
    operation_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    kitchen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kitchens.id", ondelete="CASCADE"), nullable=False, index=True
    )
    operation_type: Mapped[str] = mapped_column(String(40), nullable=False)
    server_id: Mapped[str | None] = mapped_column(String(64))
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
