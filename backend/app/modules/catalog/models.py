from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, DateTime, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.money import Money


class CatalogProduct(Base):
    """A product available to order through the Food Bundles platform.

    Reference prices here are the last-known catalog price; actual prices
    on order lines may differ when the supplier invoices. The two are kept
    separate so cost reports show real actuals, not stale reference prices.
    """

    __tablename__ = "catalog_products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    # Reference price in kitchen's currency (RWF). Null = price not yet known.
    reference_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    reference_price_minor: Mapped[int | None] = mapped_column(BigInteger)
    reference_price_currency: Mapped[str | None] = mapped_column(String(3))

    @property
    def reference_price_money(self) -> dict[str, str] | None:
        """{"amount", "currency"} from the minor-unit columns (None until set)."""
        if self.reference_price_minor is None or not self.reference_price_currency:
            return None
        return Money(int(self.reference_price_minor), self.reference_price_currency).to_api()

    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
