"""add country to kitchens

Every kitchen before Step 2a was in Rwanda (the app only served Rwanda), so existing rows
are backfilled with RW. New kitchens must send their country (ISO 3166-1 alpha-2).

Revision ID: d5a2b8c3e1f4
Revises: c4e9a1d7b2f0
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d5a2b8c3e1f4"
down_revision: str | None = "c4e9a1d7b2f0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("kitchens", sa.Column("country", sa.String(length=2), nullable=True))
    op.execute("UPDATE kitchens SET country = 'RW' WHERE country IS NULL")


def downgrade() -> None:
    op.drop_column("kitchens", "country")
