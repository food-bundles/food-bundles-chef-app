"""add route to orders

Phase 9 (12 Pay or share): how a requisition is bought (pay, restaurant or whatsapp).

Revision ID: f4c7d2e9a6b8
Revises: e2f6b8a1c3d9
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f4c7d2e9a6b8"
down_revision: str | None = "e2f6b8a1c3d9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("route", sa.String(length=12), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "route")
