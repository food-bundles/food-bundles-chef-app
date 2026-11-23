"""add the price at sale time to daily_sale_records

Step 2a review item A4. Each day's sale record keeps the menu price (minor units + ISO 4217)
it was recorded at, so revenue is reported per currency and never re-priced or mixed after
a price or kitchen-currency change. Existing rows are backfilled with their item's current
price (the only price known for them); downgrade drops the two columns.

Revision ID: a7d3e5f9c1b2
Revises: f1c3a7e9b2d4
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a7d3e5f9c1b2"
down_revision: str | None = "f1c3a7e9b2d4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "daily_sale_records", sa.Column("unit_price_minor", sa.BigInteger(), nullable=True)
    )
    op.add_column(
        "daily_sale_records", sa.Column("unit_price_currency", sa.String(3), nullable=True)
    )
    op.execute(
        "UPDATE daily_sale_records SET "
        "unit_price_minor = (SELECT m.selling_price_minor FROM menu_items m "
        "WHERE m.id = daily_sale_records.menu_item_id), "
        "unit_price_currency = (SELECT m.selling_price_currency FROM menu_items m "
        "WHERE m.id = daily_sale_records.menu_item_id)"
    )


def downgrade() -> None:
    op.drop_column("daily_sale_records", "unit_price_currency")
    op.drop_column("daily_sale_records", "unit_price_minor")
