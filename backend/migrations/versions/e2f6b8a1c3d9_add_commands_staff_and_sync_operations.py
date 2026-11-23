"""add commands, staff, shortages and applied sync operations

Phase 9 (05–08 Commands): commands and their lines (numbered from #001 each opening), the
kitchen's staff for "Recorded by", shortages of declined commands (for tomorrow's
requisition), and the ids of applied offline operations (never applied twice).

Revision ID: e2f6b8a1c3d9
Revises: d7a3c1e8b5f2
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e2f6b8a1c3d9"
down_revision: str | None = "d7a3c1e8b5f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUID = postgresql.UUID(as_uuid=True)


def upgrade() -> None:
    op.create_table(
        "kitchen_staff",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("kitchen_id", UUID, sa.ForeignKey("kitchens.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_kitchen_staff_kitchen_id", "kitchen_staff", ["kitchen_id"])

    op.create_table(
        "commands",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("kitchen_id", UUID, sa.ForeignKey("kitchens.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(10), nullable=False),
        sa.Column("table_no", sa.String(10)),
        sa.Column("source", sa.String(12), nullable=False, server_default="app"),
        sa.Column(
            "recorded_by_staff_id", UUID, sa.ForeignKey("kitchen_staff.id", ondelete="SET NULL")
        ),
        sa.Column("recorded_by_name", sa.String(100), nullable=False),
        sa.Column("recorded_by_role", sa.String(20), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("stock_deducted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("decline_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("kitchen_id", "service_date", "number", name="uq_commands_kitchen_day_number"),
    )
    op.create_index("ix_commands_kitchen_id", "commands", ["kitchen_id"])
    op.create_index("ix_commands_service_date", "commands", ["service_date"])

    op.create_table(
        "command_lines",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("command_id", UUID, sa.ForeignKey("commands.id", ondelete="CASCADE"), nullable=False),
        sa.Column("menu_item_id", UUID, sa.ForeignKey("menu_items.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("dish_name", sa.String(200), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("accepted_qty", sa.Integer()),
        sa.Column("unit_price", sa.Numeric(14, 2), nullable=False),
        sa.Column("unit_price_currency", sa.String(3), nullable=False),
    )
    op.create_index("ix_command_lines_command_id", "command_lines", ["command_id"])

    op.create_table(
        "command_shortages",
        sa.Column("id", UUID, primary_key=True),
        sa.Column("kitchen_id", UUID, sa.ForeignKey("kitchens.id", ondelete="CASCADE"), nullable=False),
        sa.Column("command_id", UUID, sa.ForeignKey("commands.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ingredient_id", UUID, sa.ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("short_qty", sa.Numeric(12, 4), nullable=False),
        sa.Column("add_to_requisition", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_command_shortages_kitchen_id", "command_shortages", ["kitchen_id"])
    op.create_index("ix_command_shortages_service_date", "command_shortages", ["service_date"])

    op.create_table(
        "sync_operations",
        sa.Column("operation_id", sa.String(64), primary_key=True),
        sa.Column("kitchen_id", UUID, sa.ForeignKey("kitchens.id", ondelete="CASCADE"), nullable=False),
        sa.Column("operation_type", sa.String(40), nullable=False),
        sa.Column("server_id", sa.String(64)),
        sa.Column("applied_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_sync_operations_kitchen_id", "sync_operations", ["kitchen_id"])


def downgrade() -> None:
    op.drop_index("ix_sync_operations_kitchen_id", table_name="sync_operations")
    op.drop_table("sync_operations")
    op.drop_index("ix_command_shortages_service_date", table_name="command_shortages")
    op.drop_index("ix_command_shortages_kitchen_id", table_name="command_shortages")
    op.drop_table("command_shortages")
    op.drop_index("ix_command_lines_command_id", table_name="command_lines")
    op.drop_table("command_lines")
    op.drop_index("ix_commands_service_date", table_name="commands")
    op.drop_index("ix_commands_kitchen_id", table_name="commands")
    op.drop_table("commands")
    op.drop_index("ix_kitchen_staff_kitchen_id", table_name="kitchen_staff")
    op.drop_table("kitchen_staff")
