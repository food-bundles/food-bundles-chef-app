from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.inventory.models import InventoryEntry


class InventoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def latest_for_ingredient(
        self, kitchen_id: uuid.UUID, ingredient_id: uuid.UUID
    ) -> InventoryEntry | None:
        result = await self._db.execute(
            select(InventoryEntry)
            .where(
                InventoryEntry.kitchen_id == kitchen_id,
                InventoryEntry.ingredient_id == ingredient_id,
            )
            .order_by(InventoryEntry.recorded_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_for_ingredient(
        self, kitchen_id: uuid.UUID, ingredient_id: uuid.UUID, limit: int = 50
    ) -> list[InventoryEntry]:
        result = await self._db.execute(
            select(InventoryEntry)
            .where(
                InventoryEntry.kitchen_id == kitchen_id,
                InventoryEntry.ingredient_id == ingredient_id,
            )
            .order_by(InventoryEntry.recorded_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def current_stock(
        self, kitchen_id: uuid.UUID, ingredient_id: uuid.UUID
    ) -> Decimal:
        entry = await self.latest_for_ingredient(kitchen_id, ingredient_id)
        return entry.quantity if entry else Decimal("0")

    async def create(self, entry: InventoryEntry) -> InventoryEntry:
        self._db.add(entry)
        await self._db.flush()
        await self._db.refresh(entry)
        return entry
