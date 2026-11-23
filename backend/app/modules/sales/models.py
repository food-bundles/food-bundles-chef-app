from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.modules.menus.models import MenuItem


class DailySaleRecord(Base):
    """Actual portions sold of one menu item on one calendar day.

    One row per (kitchen, menu_item, sale_date). Updated via upsert when the
    chef records or amends the day's count. The last 4 weeks of records drive
    the weighted demand calculation for purchasing.
    """

    __tablename__ = "daily_sale_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kitchen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kitchens.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    menu_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sale_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    portions_sold: Mapped[int] = mapped_column(Integer, nullable=False)
    # The menu price when the sale was recorded (minor units + ISO 4217), so a later price
    # or kitchen-currency change never re-prices or mixes past revenue.
    unit_price_minor: Mapped[int | None] = mapped_column(BigInteger)
    unit_price_currency: Mapped[str | None] = mapped_column(String(3))
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chefs.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    menu_item: Mapped[MenuItem] = relationship("MenuItem", lazy="noload")
