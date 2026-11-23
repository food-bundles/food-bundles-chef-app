"""add quality and issue reasons to receiving

Phase 9 (04 Receive): each received line carries the chef's quality tag (good / issue) and
the issue reasons (short_weight, damaged, not_fresh), kept as delivery-quality signals.

Revision ID: d7a3c1e8b5f2
Revises: c5e2a9d4f7b1
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d7a3c1e8b5f2"
down_revision: str | None = "c5e2a9d4f7b1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("delivery_receivings", sa.Column("quality", sa.String(length=10), nullable=True))
    op.add_column(
        "delivery_receivings", sa.Column("issue_reasons", sa.String(length=100), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("delivery_receivings", "issue_reasons")
    op.drop_column("delivery_receivings", "quality")
