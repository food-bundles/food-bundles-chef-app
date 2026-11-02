from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.kitchens.service import KitchenService
from app.modules.sales.schemas import (
    DailySaleRecordRequest,
    DailySaleRecordResponse,
    WeeklySalesSummary,
)
from app.modules.sales.service import SalesService

router = APIRouter(prefix="/kitchens/{kitchen_id}/sales", tags=["sales"])


async def _get_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
):
    svc = KitchenService(db)
    return await svc.get_kitchen(current_chef, kitchen_id)


@router.post("", response_model=DailySaleRecordResponse, status_code=201)
async def record_sale(
    body: DailySaleRecordRequest,
    kitchen=Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> DailySaleRecordResponse:
    svc = SalesService(db)
    record = await svc.record_sale(kitchen, current_chef.id, body)
    return DailySaleRecordResponse.model_validate(record)


@router.get("/{menu_item_id}/weekly", response_model=WeeklySalesSummary)
async def weekly_summary(
    menu_item_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    weeks: int = Query(4, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
) -> WeeklySalesSummary:
    svc = SalesService(db)
    return await svc.get_weekly_summary(kitchen, menu_item_id, weeks)
