"""add catalog link to ingredients

Phase 9 (09 Menu & recipe): an ingredient can be a Food Bundles catalogue product, so its
cost follows the catalogue price. Null = custom ingredient (keeps the chef's own price).

Revision ID: c5e2a9d4f7b1
Revises: b3f8d1e6a2c4
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c5e2a9d4f7b1"
down_revision: str | None = "b3f8d1e6a2c4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ingredients",
        sa.Column("catalog_product_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_ingredients_catalog_product_id",
        "ingredients",
        "catalog_products",
        ["catalog_product_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_ingredients_catalog_product_id", "ingredients", ["catalog_product_id"])


def downgrade() -> None:
    op.drop_index("ix_ingredients_catalog_product_id", table_name="ingredients")
    op.drop_constraint("fk_ingredients_catalog_product_id", "ingredients", type_="foreignkey")
    op.drop_column("ingredients", "catalog_product_id")
