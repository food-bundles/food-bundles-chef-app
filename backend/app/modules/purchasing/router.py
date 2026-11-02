from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.kitchens.service import KitchenService
from app.modules.purchasing.schemas import PurchaseSuggestionsResponse
from app.modules.purchasing.service import PurchasingService

router = APIRouter(prefix="/kitchens/{kitchen_id}/purchasing", tags=["purchasing"])


async def _get_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
):
    svc = KitchenService(db)
    return await svc.get_kitchen(current_chef, kitchen_id)


@router.get("/suggestions", response_model=PurchaseSuggestionsResponse)
async def get_purchase_suggestions(
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> PurchaseSuggestionsResponse:
    svc = PurchasingService(db)
    return await svc.get_suggestions(kitchen)
