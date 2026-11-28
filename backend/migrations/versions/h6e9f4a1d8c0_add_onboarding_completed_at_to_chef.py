"""add onboarding completed at to chef

Revision ID: h6e9f4a1d8c0
Revises: g5d8e3f0b7c9
Create Date: 2024-11-27 14:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "h6e9f4a1d8c0"
down_revision = "g5d8e3f0b7c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add onboarding_completed_at column
    op.add_column(
        "chefs",
        sa.Column("onboarding_completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Backfill: mark chefs who have both a name AND at least one kitchen as onboarded
    # This prevents existing active chefs from seeing onboarding on their next login
    op.execute(
        """
        UPDATE chefs
        SET onboarding_completed_at = updated_at
        WHERE name IS NOT NULL
        AND id IN (SELECT DISTINCT chef_id FROM kitchens)
        AND onboarding_completed_at IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("chefs", "onboarding_completed_at")
