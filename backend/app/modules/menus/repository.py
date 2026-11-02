from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.menus.models import Menu, MenuItem


class MenuRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id_and_kitchen(
        self, menu_id: uuid.UUID, kitchen_id: uuid.UUID
    ) -> Menu | None:
        result = await self._db.execute(
            select(Menu).where(Menu.id == menu_id, Menu.kitchen_id == kitchen_id)
        )
        return result.scalar_one_or_none()

    async def list_for_kitchen(self, kitchen_id: uuid.UUID) -> list[Menu]:
        result = await self._db.execute(
            select(Menu).where(Menu.kitchen_id == kitchen_id).order_by(Menu.name)
        )
        return list(result.scalars().all())

    async def create(self, menu: Menu) -> Menu:
        self._db.add(menu)
        await self._db.flush()
        await self._db.refresh(menu)
        return menu

    async def update(self, menu: Menu) -> Menu:
        await self._db.flush()
        await self._db.refresh(menu)
        return menu


class MenuItemRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id_and_kitchen(
        self, item_id: uuid.UUID, kitchen_id: uuid.UUID
    ) -> MenuItem | None:
        result = await self._db.execute(
            select(MenuItem).where(
                MenuItem.id == item_id, MenuItem.kitchen_id == kitchen_id
            )
        )
        return result.scalar_one_or_none()

    async def list_for_menu_all(self, kitchen_id: uuid.UUID) -> list[MenuItem]:
        """All active menu items across all menus for a kitchen."""
        result = await self._db.execute(
            select(MenuItem)
            .where(MenuItem.kitchen_id == kitchen_id, MenuItem.is_active == True)
            .order_by(MenuItem.name)
        )
        return list(result.scalars().all())

    async def list_for_menu(self, menu_id: uuid.UUID) -> list[MenuItem]:
        result = await self._db.execute(
            select(MenuItem)
            .where(MenuItem.menu_id == menu_id)
            .order_by(MenuItem.name)
        )
        return list(result.scalars().all())

    async def create(self, item: MenuItem) -> MenuItem:
        self._db.add(item)
        await self._db.flush()
        await self._db.refresh(item)
        return item

    async def update(self, item: MenuItem) -> MenuItem:
        await self._db.flush()
        await self._db.refresh(item)
        return item
