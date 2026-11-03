from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.kitchens.service import KitchenService
from app.modules.orders.schemas import OrderSubmitResponse
from app.modules.receiving.schemas import BulkReceivingRequest, ReceivingResponse
from app.modules.receiving.service import ReceivingService

router = APIRouter(
    prefix="/kitchens/{kitchen_id}/orders/{order_id}/receiving",
    tags=["receiving"],
)


async def _get_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
):
    svc = KitchenService(db)
    return await svc.get_kitchen(current_chef, kitchen_id)


@router.post("/start", response_model=OrderSubmitResponse)
async def start_delivery(
    order_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> OrderSubmitResponse:
    """Transition a confirmed order to out_for_delivery (delivery started)."""
    svc = ReceivingService(db)
    return await svc.start_delivery(kitchen, order_id)


@router.post("", response_model=list[ReceivingResponse], status_code=201)
async def receive_delivery(
    order_id: uuid.UUID,
    body: BulkReceivingRequest,
    kitchen=Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> list[ReceivingResponse]:
    svc = ReceivingService(db)
    return await svc.receive_delivery(kitchen, order_id, current_chef.id, body)
