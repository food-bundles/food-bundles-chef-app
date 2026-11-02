from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import KitchenAccessDeniedError, NotFoundError


async def require_kitchen_access(
    kitchen_id: uuid.UUID,
    chef_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """Raise KitchenAccessDeniedError if the chef does not own this kitchen.

    Import the Kitchen model here to avoid circular imports.
    """
    from app.modules.kitchens.models import Kitchen

    result = await db.execute(
        select(Kitchen.id).where(
            Kitchen.id == kitchen_id,
            Kitchen.chef_id == chef_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise KitchenAccessDeniedError()
