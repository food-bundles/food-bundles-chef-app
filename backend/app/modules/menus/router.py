from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.kitchens.service import KitchenService
from app.modules.menus.schemas import (
    MenuCreateRequest,
    MenuItemCreateRequest,
    MenuItemResponse,
    MenuItemUpdateRequest,
    MenuResponse,
    MenuUpdateRequest,
)
from app.modules.menus.service import MenuService

router = APIRouter(prefix="/kitchens/{kitchen_id}/menus", tags=["menus"])


async def _get_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
):
    svc = KitchenService(db)
    return await svc.get_kitchen(current_chef, kitchen_id)


@router.get("", response_model=list[MenuResponse])
async def list_menus(
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> list[MenuResponse]:
    svc = MenuService(db)
    menus = await svc.list_menus(kitchen)
    return [MenuResponse.model_validate(m) for m in menus]


@router.post("", response_model=MenuResponse, status_code=201)
async def create_menu(
    body: MenuCreateRequest,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> MenuResponse:
    svc = MenuService(db)
    menu = await svc.create_menu(kitchen, body)
    return MenuResponse.model_validate(menu)


@router.get("/{menu_id}", response_model=MenuResponse)
async def get_menu(
    menu_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> MenuResponse:
    svc = MenuService(db)
    menu = await svc.get_menu(kitchen, menu_id)
    return MenuResponse.model_validate(menu)


@router.patch("/{menu_id}", response_model=MenuResponse)
async def update_menu(
    menu_id: uuid.UUID,
    body: MenuUpdateRequest,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> MenuResponse:
    svc = MenuService(db)
    menu = await svc.update_menu(kitchen, menu_id, body)
    return MenuResponse.model_validate(menu)


@router.get("/{menu_id}/items", response_model=list[MenuItemResponse])
async def list_items(
    menu_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> list[MenuItemResponse]:
    svc = MenuService(db)
    items = await svc.list_items(kitchen, menu_id)
    return [MenuItemResponse.model_validate(i) for i in items]


@router.post("/{menu_id}/items", response_model=MenuItemResponse, status_code=201)
async def create_item(
    menu_id: uuid.UUID,
    body: MenuItemCreateRequest,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> MenuItemResponse:
    svc = MenuService(db)
    item = await svc.create_item(kitchen, menu_id, body)
    return MenuItemResponse.model_validate(item)


@router.patch("/{menu_id}/items/{item_id}", response_model=MenuItemResponse)
async def update_item(
    menu_id: uuid.UUID,
    item_id: uuid.UUID,
    body: MenuItemUpdateRequest,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> MenuItemResponse:
    svc = MenuService(db)
    item = await svc.update_item(kitchen, menu_id, item_id, body)
    return MenuItemResponse.model_validate(item)
