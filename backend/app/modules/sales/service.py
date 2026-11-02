from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.modules.kitchens.models import Kitchen
from app.modules.menus.repository import MenuItemRepository
from app.modules.sales.models import DailySaleRecord
from app.modules.sales.repository import SalesRepository
from app.modules.sales.schemas import (
    DailySaleRecordRequest,
    WeeklySalesSummary,
    WeeklyTotal,
)


class SalesService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = SalesRepository(db)
        self._item_repo = MenuItemRepository(db)

    async def record_sale(
        self,
        kitchen: Kitchen,
        chef_id: uuid.UUID,
        data: DailySaleRecordRequest,
    ) -> DailySaleRecord:
        item = await self._item_repo.get_by_id_and_kitchen(data.menu_item_id, kitchen.id)
        if item is None:
            raise NotFoundError("Menu item not found in this kitchen.")

        return await self._repo.upsert(
            kitchen_id=kitchen.id,
            menu_item_id=data.menu_item_id,
            sale_date=data.sale_date,
            portions_sold=data.portions_sold,
            recorded_by=chef_id,
        )

    async def get_weekly_summary(
        self,
        kitchen: Kitchen,
        menu_item_id: uuid.UUID,
        weeks: int = 4,
    ) -> WeeklySalesSummary:
        item = await self._item_repo.get_by_id_and_kitchen(menu_item_id, kitchen.id)
        if item is None:
            raise NotFoundError("Menu item not found in this kitchen.")

        weekly = await self._repo.weekly_totals(kitchen.id, menu_item_id, weeks=weeks)
        return WeeklySalesSummary(
            menu_item_id=menu_item_id,
            menu_item_name=item.name,
            weeks=[WeeklyTotal(week_start=ws, total_portions=total) for ws, total in weekly],
        )
