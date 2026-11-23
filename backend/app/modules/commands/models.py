"""Commands, their lines, staff and declined shortages (Phase 9, spec screens 05–08)."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _now() -> datetime:
    return datetime.now(UTC)


class KitchenStaff(Base):
    """People who record commands on the chef's phone ("Recorded by"). No logins yet."""

    __tablename__ = "kitchen_staff"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kitchen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kitchens.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # chef | waiter | cashier
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Command(Base):
    __tablename__ = "commands"
    __table_args__ = (
        UniqueConstraint("kitchen_id", "service_date", "number", name="uq_commands_kitchen_day_number"),
    )

    # Client-generated (offline): the same id sent twice is the same command.
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kitchen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kitchens.id", ondelete="CASCADE"), nullable=False, index=True
    )
    service_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    # Running count since opening (#001 at each opening); assigned by the server.
    number: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # dine_in | to_go
    table_no: Mapped[str | None] = mapped_column(String(10))
    source: Mapped[str] = mapped_column(String(12), nullable=False, default="app")
    recorded_by_staff_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kitchen_staff.id", ondelete="SET NULL")
    )
    recorded_by_name: Mapped[str] = mapped_column(String(100), nullable=False)
    recorded_by_role: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(12), nullable=False)
    # True once the recipe was taken out of stock (so a cancel puts it back exactly once).
    stock_deducted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    decline_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    lines: Mapped[list[CommandLine]] = relationship(
        "CommandLine", back_populates="command", lazy="selectin", cascade="all, delete-orphan"
    )


class CommandLine(Base):
    __tablename__ = "command_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    command_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commands.id", ondelete="CASCADE"), nullable=False, index=True
    )
    menu_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("menu_items.id", ondelete="RESTRICT"), nullable=False
    )
    dish_name: Mapped[str] = mapped_column(String(200), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    # Portions taken ("Accept X of Y"); the rest was declined. Null until accepted.
    accepted_qty: Mapped[int | None] = mapped_column(Integer)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    unit_price_currency: Mapped[str] = mapped_column(String(3), nullable=False)

    command: Mapped[Command] = relationship("Command", back_populates="lines", lazy="noload")


class CommandShortage(Base):
    """What a declined command was short of; added to tomorrow's requisition when asked."""

    __tablename__ = "command_shortages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kitchen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kitchens.id", ondelete="CASCADE"), nullable=False, index=True
    )
    command_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commands.id", ondelete="CASCADE"), nullable=False
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False
    )
    service_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    short_qty: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    add_to_requisition: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
