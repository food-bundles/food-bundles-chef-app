"""add exchange_rates

Step 2a build step 3 (docs/design/global-readiness.md, section b). USD-based rates per day
and source, written only by the rates job. Downgrade drops the table (rates can be fetched
again; nothing else references it).

Revision ID: f1c3a7e9b2d4
Revises: e8b4c1d2f3a5
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f1c3a7e9b2d4"
down_revision: str | None = "e8b4c1d2f3a5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "exchange_rates",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("rate_date", sa.Date(), nullable=False),
        sa.Column("base", sa.String(length=3), nullable=False),
        sa.Column("quote", sa.String(length=3), nullable=False),
        sa.Column("rate", sa.Numeric(24, 12), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=False),
        sa.Column("provider_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "fetched_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("rate_date", "base", "quote", "source", name="uq_exchange_rates_key"),
        sa.CheckConstraint("rate > 0", name="ck_exchange_rates_positive"),
    )
    op.create_index("ix_exchange_rates_pair_date", "exchange_rates", ["base", "quote", "rate_date"])


def downgrade() -> None:
    op.drop_index("ix_exchange_rates_pair_date", table_name="exchange_rates")
    op.drop_table("exchange_rates")
