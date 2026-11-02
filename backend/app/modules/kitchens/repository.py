from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.kitchens.models import Kitchen
from app.shared.enums import KitchenStatus


class KitchenRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, kitchen_id: uuid.UUID) -> Kitchen | None:
        result = await self._db.execute(
            select(Kitchen).where(Kitchen.id == kitchen_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_chef(
        self, kitchen_id: uuid.UUID, chef_id: uuid.UUID
    ) -> Kitchen | None:
        result = await self._db.execute(
            select(Kitchen).where(
                Kitchen.id == kitchen_id,
                Kitchen.chef_id == chef_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_chef(self, chef_id: uuid.UUID) -> list[Kitchen]:
        result = await self._db.execute(
            select(Kitchen)
            .where(Kitchen.chef_id == chef_id, Kitchen.status != KitchenStatus.ARCHIVED)
            .order_by(Kitchen.created_at)
        )
        return list(result.scalars().all())

    async def create(self, kitchen: Kitchen) -> Kitchen:
        self._db.add(kitchen)
        await self._db.flush()
        await self._db.refresh(kitchen)
        return kitchen

    async def update(self, kitchen: Kitchen) -> Kitchen:
        await self._db.flush()
        await self._db.refresh(kitchen)
        return kitchen
