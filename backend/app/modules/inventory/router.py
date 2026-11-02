from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.inventory.schemas import (
    InventoryEntryCreateRequest,
    InventoryEntryResponse,
    StockLevelResponse,
)
from app.modules.inventory.service import InventoryService
from app.modules.kitchens.service import KitchenService

router = APIRouter(prefix="/kitchens/{kitchen_id}/inventory", tags=["inventory"])


async def _get_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
):
    svc = KitchenService(db)
    return await svc.get_kitchen(current_chef, kitchen_id)


@router.get("", response_model=list[StockLevelResponse])
async def get_stock_levels(
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> list[StockLevelResponse]:
    svc = InventoryService(db)
    return await svc.get_stock_levels(kitchen)


@router.post("", response_model=InventoryEntryResponse, status_code=201)
async def record_stock(
    body: InventoryEntryCreateRequest,
    kitchen=Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> InventoryEntryResponse:
    svc = InventoryService(db)
    entry = await svc.record_stock(kitchen, current_chef.id, body)
    return InventoryEntryResponse.model_validate(entry)


@router.get("/{ingredient_id}/history", response_model=list[InventoryEntryResponse])
async def get_history(
    ingredient_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[InventoryEntryResponse]:
    svc = InventoryService(db)
    entries = await svc.get_ingredient_history(kitchen, ingredient_id, limit)
    return [InventoryEntryResponse.model_validate(e) for e in entries]
