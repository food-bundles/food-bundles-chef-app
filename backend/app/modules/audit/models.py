from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditEvent(Base):
    """Append-only audit log for sensitive actions.

    Never update or delete rows. Insert only. Keep no personal data in the
    details field beyond what is necessary to reconstruct the action.
    """

    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_actor_occurred_at", "actor_id", "occurred_at"),
        Index("ix_audit_events_kitchen_occurred_at", "kitchen_id", "occurred_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), index=True)
    kitchen_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    ip_address: Mapped[str | None] = mapped_column(String(45))
    # Non-sensitive context — no raw user data, secrets or PII
    details: Mapped[str | None] = mapped_column(Text)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
