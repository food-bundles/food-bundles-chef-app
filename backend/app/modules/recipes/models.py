from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RecipeLine(Base):
    """One ingredient line in a menu item's recipe.

    qty_per_portion is the raw quantity (before yield) needed for one portion of
    the parent menu item. yield_fraction here overrides the ingredient default,
    allowing different recipes to use the same ingredient at different prep levels.
    """

    __tablename__ = "recipe_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    menu_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ingredients.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # qty_per_portion: raw quantity of ingredient for one portion of this menu item
    qty_per_portion: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    # yield_fraction override — if None, use ingredient.yield_fraction
    yield_fraction_override: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    menu_item: Mapped["MenuItem"] = relationship(  # noqa: F821
        "MenuItem", back_populates="recipe_lines", lazy="noload"
    )
    ingredient: Mapped["Ingredient"] = relationship(  # noqa: F821
        "Ingredient", back_populates="recipe_lines", lazy="noload"
    )
