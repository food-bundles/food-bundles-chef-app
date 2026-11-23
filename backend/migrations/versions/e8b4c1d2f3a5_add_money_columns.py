"""add money columns (minor units + ISO 4217 currency)

Step 2a build step 2 (docs/design/global-readiness.md).

- menu_items.selling_price, order_lines.unit_price, catalog_products.reference_price gain
  `*_minor` (BIGINT) and `*_currency` (CHAR 3). The decimal columns stay for one release
  (dual-write) and are dropped in a later migration.
- ingredients.cost_per_unit widens to NUMERIC(18,6) and gains cost_per_unit_currency.
- kitchens gain price_step (per-kitchen step for suggested prices; null = currency default).

Backfill uses each row's kitchen currency (every kitchen so far is RWF) and the configured
catalogue currency. **The upgrade stops before changing anything** if any amount has more
decimals than its currency allows (e.g. 1500.50 RWF): converting it would round silently.

Revision ID: e8b4c1d2f3a5
Revises: d5a2b8c3e1f4
Create Date: 2026-11-19
"""

from collections.abc import Sequence
from decimal import Decimal

import sqlalchemy as sa
from alembic import op
from app.core.config import settings
from app.shared.money import Money
from app.shared.money_fields import AmountRow, find_inexact_amounts

revision: str = "e8b4c1d2f3a5"
down_revision: str | None = "d5a2b8c3e1f4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (table, amount column, how to find the row's currency)
_KITCHEN_PRICED = [
    (
        "menu_items",
        "selling_price",
        "SELECT m.id, m.selling_price, k.currency FROM menu_items m "
        "JOIN kitchens k ON k.id = m.kitchen_id",
    ),
    (
        "order_lines",
        "unit_price",
        "SELECT l.id, l.unit_price, k.currency FROM order_lines l "
        "JOIN orders o ON o.id = l.order_id JOIN kitchens k ON k.id = o.kitchen_id",
    ),
]


def _rows(conn: sa.Connection) -> list[AmountRow]:
    rows: list[AmountRow] = []
    for table, _column, query in _KITCHEN_PRICED:
        for row_id, amount, currency in conn.execute(sa.text(query)):
            rows.append(AmountRow(table, str(row_id), Decimal(amount), currency))
    catalog_currency = settings.FOOD_BUNDLES_CATALOG_CURRENCY
    for row_id, amount in conn.execute(
        sa.text(
            "SELECT id, reference_price FROM catalog_products WHERE reference_price IS NOT NULL"
        )
    ):
        rows.append(AmountRow("catalog_products", str(row_id), Decimal(amount), catalog_currency))
    return rows


def upgrade() -> None:
    conn = op.get_bind()
    rows = _rows(conn)
    bad = find_inexact_amounts(rows)
    if bad:
        summary = ", ".join(
            f"{t}: {sum(1 for b in bad if b.table == t)}" for t in sorted({b.table for b in bad})
        )
        first = "; ".join(f"{b.table}.{b.row_id} = {b.amount} {b.currency}" for b in bad[:10])
        raise RuntimeError(
            f"Money migration stopped: {len(bad)} amount(s) have more decimals than their "
            f"currency allows ({summary}). Nothing was changed. Fix or decide on these rows "
            f"first, e.g. {first}"
        )

    op.add_column("menu_items", sa.Column("selling_price_minor", sa.BigInteger(), nullable=True))
    op.add_column("menu_items", sa.Column("selling_price_currency", sa.String(3), nullable=True))
    op.add_column("order_lines", sa.Column("unit_price_minor", sa.BigInteger(), nullable=True))
    op.add_column("order_lines", sa.Column("unit_price_currency", sa.String(3), nullable=True))
    op.add_column(
        "catalog_products", sa.Column("reference_price_minor", sa.BigInteger(), nullable=True)
    )
    op.add_column(
        "catalog_products", sa.Column("reference_price_currency", sa.String(3), nullable=True)
    )
    op.add_column("ingredients", sa.Column("cost_per_unit_currency", sa.String(3), nullable=True))
    op.alter_column(
        "ingredients", "cost_per_unit", type_=sa.Numeric(18, 6), existing_type=sa.Numeric(14, 2)
    )
    op.add_column("kitchens", sa.Column("price_step", sa.Numeric(14, 4), nullable=True))

    column_for = {
        "menu_items": "selling_price",
        "order_lines": "unit_price",
        "catalog_products": "reference_price",
    }
    for row in rows:
        field = column_for[row.table]
        money = Money.of(row.amount, row.currency)
        conn.execute(
            sa.text(
                f"UPDATE {row.table} SET {field}_minor = :minor, {field}_currency = :currency "  # noqa: S608 - fixed identifiers
                "WHERE id = :id"
            ),
            {"minor": money.amount_minor, "currency": money.currency, "id": row.row_id},
        )
    conn.execute(
        sa.text(
            "UPDATE ingredients SET cost_per_unit_currency = "
            "(SELECT k.currency FROM kitchens k WHERE k.id = ingredients.kitchen_id) "
            "WHERE cost_per_unit IS NOT NULL"
        )
    )


def downgrade() -> None:
    op.drop_column("kitchens", "price_step")
    # Unit costs with more than 2 decimals are rounded to 2 by this downgrade (the old type).
    op.alter_column(
        "ingredients", "cost_per_unit", type_=sa.Numeric(14, 2), existing_type=sa.Numeric(18, 6)
    )
    op.drop_column("ingredients", "cost_per_unit_currency")
    op.drop_column("catalog_products", "reference_price_currency")
    op.drop_column("catalog_products", "reference_price_minor")
    op.drop_column("order_lines", "unit_price_currency")
    op.drop_column("order_lines", "unit_price_minor")
    op.drop_column("menu_items", "selling_price_currency")
    op.drop_column("menu_items", "selling_price_minor")
