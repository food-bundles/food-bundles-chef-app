from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.kitchens.service import KitchenService
from app.modules.orders.schemas import (
    OrderCreateRequest,
    OrderResponse,
    OrderSubmitResponse,
    OrderWithLinesResponse,
)
from app.modules.orders.service import OrderService
from app.shared.enums import OrderStatus

router = APIRouter(prefix="/kitchens/{kitchen_id}/orders", tags=["orders"])


async def _get_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
):
    svc = KitchenService(db)
    return await svc.get_kitchen(current_chef, kitchen_id)


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    kitchen=Depends(_get_kitchen),
    status: OrderStatus | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[OrderResponse]:
    svc = OrderService(db)
    orders = await svc.list_orders(kitchen, status)
    return [OrderResponse.model_validate(o) for o in orders]


@router.post("", response_model=OrderWithLinesResponse, status_code=201)
async def create_order(
    body: OrderCreateRequest,
    kitchen=Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> OrderWithLinesResponse:
    svc = OrderService(db)
    return await svc.create_order(kitchen, current_chef, body)


@router.get("/{order_id}", response_model=OrderWithLinesResponse)
async def get_order(
    order_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> OrderWithLinesResponse:
    svc = OrderService(db)
    return await svc.get_order(kitchen, order_id)


@router.post("/{order_id}/submit", response_model=OrderSubmitResponse)
async def submit_order(
    order_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> OrderSubmitResponse:
    svc = OrderService(db)
    result = await svc.submit_order(kitchen, order_id)
    # Fire-and-forget: sync to Food Bundles API via background worker
    from app.core.queue import get_queue
    queue = await get_queue()
    if queue is not None:
        await queue.enqueue_job(
            "sync_order_to_food_bundles",
            order_id=str(order_id),
            kitchen_id=str(kitchen.id),
        )
    return result


@router.post("/{order_id}/confirm", response_model=OrderSubmitResponse)
async def confirm_order(
    order_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> OrderSubmitResponse:
    """Mark order as confirmed (called by Food Bundles backend or for manual confirmation)."""
    svc = OrderService(db)
    return await svc.confirm_order(kitchen, order_id)


@router.post("/{order_id}/cancel", response_model=OrderSubmitResponse)
async def cancel_order(
    order_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> OrderSubmitResponse:
    """Cancel a draft or submitted order."""
    svc = OrderService(db)
    return await svc.cancel_order(kitchen, order_id)
