from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.ingredients.models import Ingredient


class IngredientRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, ingredient_id: uuid.UUID) -> Ingredient | None:
        result = await self._db.execute(
            select(Ingredient).where(Ingredient.id == ingredient_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_kitchen(
        self, ingredient_id: uuid.UUID, kitchen_id: uuid.UUID
    ) -> Ingredient | None:
        result = await self._db.execute(
            select(Ingredient).where(
                Ingredient.id == ingredient_id,
                Ingredient.kitchen_id == kitchen_id,
            )
        )
        return result.scalar_one_or_none()

    async def find_by_name(self, kitchen_id: uuid.UUID, name: str) -> Ingredient | None:
        """Active ingredient in this kitchen whose name matches case-insensitively."""
        result = await self._db.execute(
            select(Ingredient).where(
                Ingredient.kitchen_id == kitchen_id,
                Ingredient.is_active == True,  # noqa: E712
                func.lower(Ingredient.name) == name.strip().lower(),
            )
        )
        return result.scalars().first()

    async def list_for_kitchen(
        self, kitchen_id: uuid.UUID, active_only: bool = True
    ) -> list[Ingredient]:
        q = select(Ingredient).where(Ingredient.kitchen_id == kitchen_id)
        if active_only:
            q = q.where(Ingredient.is_active.is_(True))
        q = q.order_by(Ingredient.name)
        result = await self._db.execute(q)
        return list(result.scalars().all())

    async def create(self, ingredient: Ingredient) -> Ingredient:
        self._db.add(ingredient)
        await self._db.flush()
        await self._db.refresh(ingredient)
        return ingredient

    async def update(self, ingredient: Ingredient) -> Ingredient:
        await self._db.flush()
        await self._db.refresh(ingredient)
        return ingredient
