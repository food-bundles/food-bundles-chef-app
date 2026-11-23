from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ExchangeRate(Base):
    """One published rate: 1 `base` = `rate` `quote` on `rate_date`, from `source`.

    Written ONLY by the rates job (app/modules/exchange_rates/store.py; an architecture test
    enforces it). Every stored rate is USD-based; other pairs are cross rates computed from
    the same day and source. AI models never write, estimate or read these rates.
    """

    __tablename__ = "exchange_rates"
    __table_args__ = (
        UniqueConstraint("rate_date", "base", "quote", "source", name="uq_exchange_rates_key"),
        Index("ix_exchange_rates_pair_date", "base", "quote", "rate_date"),
        CheckConstraint("rate > 0", name="ck_exchange_rates_positive"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rate_date: Mapped[date] = mapped_column(Date, nullable=False)
    base: Mapped[str] = mapped_column(String(3), nullable=False)
    quote: Mapped[str] = mapped_column(String(3), nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(24, 12), nullable=False)
    source: Mapped[str] = mapped_column(String(30), nullable=False)
    provider_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )
