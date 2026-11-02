from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.chefs.models import Chef


class ChefRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, chef_id: uuid.UUID) -> Chef | None:
        result = await self._db.execute(
            select(Chef).where(Chef.id == chef_id, Chef.is_active == True)
        )
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone_number: str) -> Chef | None:
        result = await self._db.execute(
            select(Chef).where(Chef.phone_number == phone_number)
        )
        return result.scalar_one_or_none()

    async def update(self, chef: Chef) -> Chef:
        await self._db.flush()
        await self._db.refresh(chef)
        return chef
