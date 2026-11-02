from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.shared.enums import ReceivingDecision


class DeliveryReceiving(Base):
    """Records what was physically received when a Food Bundles delivery arrives.

    One row per order line. The chef inspects each item, enters the received
    quantity, and optionally marks a ReceivingDecision if partial or rejected.
    Accepted quantities are auto-posted to inventory as "delivery" entries.
    """

    __tablename__ = "delivery_receivings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_line_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("order_lines.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    kitchen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kitchens.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity_received: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    decision: Mapped[str] = mapped_column(
        String(30), nullable=False, default=ReceivingDecision.ACCEPTED
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    received_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chefs.id", ondelete="SET NULL")
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
