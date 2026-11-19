from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.modules.inventory.models import InventoryEntry
    from app.modules.recipes.models import RecipeLine


class Ingredient(Base):
    """A kitchen-scoped ingredient/stock item.

    qty_per_portion and yield_fraction drive all purchasing and inventory
    calculations. All fractional quantities use Decimal to avoid float drift.
    """

    __tablename__ = "ingredients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kitchen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kitchens.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)  # e.g. "kg", "litre", "piece"
    # yield_fraction: usable proportion after prep (0 < x ≤ 1). E.g. 0.85 for 15% trim loss.
    yield_fraction: Mapped[Decimal] = mapped_column(
        Numeric(6, 4), nullable=False, default=Decimal("1.0000")
    )
    # qty_per_portion: raw quantity of this ingredient per menu portion (in `unit`)
    qty_per_portion: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), nullable=False, default=Decimal("0.0000")
    )
    # cost_per_unit: latest known purchase cost (RWF or kitchen currency)
    # A unit cost is often a fraction of the smallest coin (0.35 RWF per g): 6 decimals,
    # in the currency it was entered in (may differ from the kitchen's).
    cost_per_unit: Mapped[Decimal | None] = mapped_column(Numeric(18, 6))
    cost_per_unit_currency: Mapped[str | None] = mapped_column(String(3))
    # selling_unit_size: the supplier's minimum order multiple (e.g. 5 kg bag → 5)
    selling_unit_size: Mapped[Decimal] = mapped_column(
        Numeric(10, 3), nullable=False, default=Decimal("1.000")
    )
    # days_open_per_week: how many days/week this kitchen uses this ingredient
    days_open_per_week: Mapped[int] = mapped_column(nullable=False, default=7)
    # safety_buffer_fraction: override per ingredient (null → use SAFETY_BUFFER_FRACTION)
    safety_buffer_fraction: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    stock_entries: Mapped[list[InventoryEntry]] = relationship(
        "InventoryEntry", back_populates="ingredient", lazy="noload"
    )
    recipe_lines: Mapped[list[RecipeLine]] = relationship(
        "RecipeLine", back_populates="ingredient", lazy="noload"
    )
