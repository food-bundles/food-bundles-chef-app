"""add_category_to_menu_items

Revision ID: b7d2e4f1a9c3
Revises: a3f1c8e22d09
Create Date: 2026-11-17 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b7d2e4f1a9c3'
down_revision: str | None = 'a3f1c8e22d09'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column('menu_items', sa.Column('category', sa.String(length=20), nullable=True))
    op.create_check_constraint(
        'ck_menu_items_category',
        'menu_items',
        "category IS NULL OR category IN ('main', 'side', 'drink', 'dessert')",
    )


def downgrade() -> None:
    op.drop_constraint('ck_menu_items_category', 'menu_items', type_='check')
    op.drop_column('menu_items', 'category')
