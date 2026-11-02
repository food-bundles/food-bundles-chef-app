from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.recipes.models import RecipeLine


class RecipeRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_for_item(self, menu_item_id: uuid.UUID) -> list[RecipeLine]:
        result = await self._db.execute(
            select(RecipeLine)
            .where(RecipeLine.menu_item_id == menu_item_id)
            .options(selectinload(RecipeLine.ingredient))
        )
        return list(result.scalars().all())

    async def get_by_id(self, line_id: uuid.UUID) -> RecipeLine | None:
        result = await self._db.execute(
            select(RecipeLine)
            .where(RecipeLine.id == line_id)
            .options(selectinload(RecipeLine.ingredient))
        )
        return result.scalar_one_or_none()

    async def create(self, line: RecipeLine) -> RecipeLine:
        self._db.add(line)
        await self._db.flush()
        await self._db.refresh(line)
        return line

    async def update(self, line: RecipeLine) -> RecipeLine:
        await self._db.flush()
        await self._db.refresh(line)
        return line

    async def delete(self, line: RecipeLine) -> None:
        await self._db.delete(line)
        await self._db.flush()
