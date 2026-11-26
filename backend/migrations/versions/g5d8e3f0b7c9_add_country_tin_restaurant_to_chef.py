"""add country tin restaurant to chef

Revision ID: g5d8e3f0b7c9
Revises: f4c7d2e9a6b8
Create Date: 2024-11-27 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "g5d8e3f0b7c9"
down_revision = "f4c7d2e9a6b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new nullable columns to chefs table
    op.add_column("chefs", sa.Column("country", sa.String(length=2), nullable=True))
    op.add_column("chefs", sa.Column("tin", sa.String(length=50), nullable=True))
    op.add_column("chefs", sa.Column("restaurant_id", sa.String(length=50), nullable=True))
    op.add_column("chefs", sa.Column("restaurant_name", sa.String(length=200), nullable=True))


def downgrade() -> None:
    # Remove columns if rolling back
    op.drop_column("chefs", "restaurant_name")
    op.drop_column("chefs", "restaurant_id")
    op.drop_column("chefs", "tin")
    op.drop_column("chefs", "country")
