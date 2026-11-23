from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.shared.money import Money

if TYPE_CHECKING:
    from app.modules.recipes.models import RecipeLine


class Menu(Base):
    """A named collection of MenuItems for a kitchen."""

    __tablename__ = "menus"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kitchen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kitchens.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    items: Mapped[list[MenuItem]] = relationship(
        "MenuItem", back_populates="menu", lazy="noload", cascade="all, delete-orphan"
    )


class MenuItem(Base):
    """One dish/product sold from a menu, with a selling price."""

    __tablename__ = "menu_items"
    __table_args__ = (
        CheckConstraint(
            "category IS NULL OR category IN ('main', 'side', 'drink', 'dessert')",
            name="ck_menu_items_category",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    menu_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("menus.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    kitchen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("kitchens.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    # Menu section used for filtering: main | side | drink | dessert (null = uncategorised)
    category: Mapped[str | None] = mapped_column(String(20))
    # selling_price: price charged to the customer in kitchen currency
    selling_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    # Money (Step 2a): exact minor units + ISO 4217. `selling_price` is kept (dual-write)
    # for one release so older clients keep working.
    selling_price_minor: Mapped[int | None] = mapped_column(BigInteger)
    selling_price_currency: Mapped[str | None] = mapped_column(String(3))

    @property
    def selling_price_money(self) -> dict[str, str] | None:
        """{"amount", "currency"} from the minor-unit columns (None until set)."""
        if self.selling_price_minor is None or not self.selling_price_currency:
            return None
        return Money(int(self.selling_price_minor), self.selling_price_currency).to_api()

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    menu: Mapped[Menu] = relationship("Menu", back_populates="items", lazy="noload")
    recipe_lines: Mapped[list[RecipeLine]] = relationship(
        "RecipeLine", back_populates="menu_item", lazy="noload", cascade="all, delete-orphan"
    )
