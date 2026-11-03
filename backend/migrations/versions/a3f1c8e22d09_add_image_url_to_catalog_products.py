"""add_image_url_to_catalog_products

Revision ID: a3f1c8e22d09
Revises: 70253d6f928e
Create Date: 2026-11-03 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a3f1c8e22d09'
down_revision: str | None = '70253d6f928e'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('catalog_products', sa.Column('image_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('catalog_products', 'image_url')
