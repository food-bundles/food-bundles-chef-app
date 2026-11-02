from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import KitchenAccessDeniedError, NotFoundError
from app.modules.kitchens.models import Kitchen
from app.modules.menus.models import Menu, MenuItem
from app.modules.menus.repository import MenuItemRepository, MenuRepository
from app.modules.menus.schemas import (
    MenuCreateRequest,
    MenuItemCreateRequest,
    MenuItemUpdateRequest,
    MenuUpdateRequest,
)


class MenuService:
    def __init__(self, db: AsyncSession) -> None:
        self._menu_repo = MenuRepository(db)
        self._item_repo = MenuItemRepository(db)

    async def list_menus(self, kitchen: Kitchen) -> list[Menu]:
        return await self._menu_repo.list_for_kitchen(kitchen.id)

    async def create_menu(self, kitchen: Kitchen, data: MenuCreateRequest) -> Menu:
        menu = Menu(kitchen_id=kitchen.id, name=data.name, description=data.description)
        return await self._menu_repo.create(menu)

    async def get_menu(self, kitchen: Kitchen, menu_id: uuid.UUID) -> Menu:
        return await self._require_menu(kitchen, menu_id)

    async def update_menu(
        self, kitchen: Kitchen, menu_id: uuid.UUID, data: MenuUpdateRequest
    ) -> Menu:
        menu = await self._require_menu(kitchen, menu_id)
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(menu, field, value)
        return await self._menu_repo.update(menu)

    async def list_items(self, kitchen: Kitchen, menu_id: uuid.UUID) -> list[MenuItem]:
        await self._require_menu(kitchen, menu_id)
        return await self._item_repo.list_for_menu(menu_id)

    async def create_item(
        self, kitchen: Kitchen, menu_id: uuid.UUID, data: MenuItemCreateRequest
    ) -> MenuItem:
        await self._require_menu(kitchen, menu_id)
        item = MenuItem(
            menu_id=menu_id,
            kitchen_id=kitchen.id,
            name=data.name,
            description=data.description,
            selling_price=data.selling_price,
        )
        return await self._item_repo.create(item)

    async def update_item(
        self,
        kitchen: Kitchen,
        menu_id: uuid.UUID,
        item_id: uuid.UUID,
        data: MenuItemUpdateRequest,
    ) -> MenuItem:
        await self._require_menu(kitchen, menu_id)
        item = await self._require_item(kitchen, item_id)
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(item, field, value)
        return await self._item_repo.update(item)

    async def _require_menu(self, kitchen: Kitchen, menu_id: uuid.UUID) -> Menu:
        menu = await self._menu_repo.get_by_id_and_kitchen(menu_id, kitchen.id)
        if menu is None:
            raise NotFoundError("Menu not found.")
        return menu

    async def _require_item(self, kitchen: Kitchen, item_id: uuid.UUID) -> MenuItem:
        item = await self._item_repo.get_by_id_and_kitchen(item_id, kitchen.id)
        if item is None:
            raise NotFoundError("Menu item not found.")
        return item
