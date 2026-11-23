"""add service hours to kitchens

Phase 9: Home shows one job at a time, calculated from the kitchen's opening and closing
times. Existing kitchens get the spec's sample hours (11:00-22:00), editable in Profile.

Revision ID: b3f8d1e6a2c4
Revises: a7d3e5f9c1b2
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b3f8d1e6a2c4"
down_revision: str | None = "a7d3e5f9c1b2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "kitchens",
        sa.Column("opening_time", sa.Time(), nullable=False, server_default="11:00"),
    )
    op.add_column(
        "kitchens",
        sa.Column("closing_time", sa.Time(), nullable=False, server_default="22:00"),
    )


def downgrade() -> None:
    op.drop_column("kitchens", "closing_time")
    op.drop_column("kitchens", "opening_time")
