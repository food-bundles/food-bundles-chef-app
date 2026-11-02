from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.kitchens.schemas import (
    KitchenCreateRequest,
    KitchenResponse,
    KitchenUpdateRequest,
)
from app.modules.kitchens.service import KitchenService

router = APIRouter(prefix="/kitchens", tags=["kitchens"])


def _get_service(db: AsyncSession = Depends(get_db)) -> KitchenService:
    return KitchenService(db)


@router.get("", response_model=list[KitchenResponse])
async def list_kitchens(
    current_chef: Chef = Depends(get_current_chef),
    service: KitchenService = Depends(_get_service),
) -> list[KitchenResponse]:
    kitchens = await service.list_kitchens(current_chef)
    return [KitchenResponse.model_validate(k) for k in kitchens]


@router.post("", response_model=KitchenResponse, status_code=201)
async def create_kitchen(
    body: KitchenCreateRequest,
    current_chef: Chef = Depends(get_current_chef),
    service: KitchenService = Depends(_get_service),
) -> KitchenResponse:
    kitchen = await service.create_kitchen(current_chef, body)
    return KitchenResponse.model_validate(kitchen)


@router.get("/{kitchen_id}", response_model=KitchenResponse)
async def get_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    service: KitchenService = Depends(_get_service),
) -> KitchenResponse:
    kitchen = await service.get_kitchen(current_chef, kitchen_id)
    return KitchenResponse.model_validate(kitchen)


@router.patch("/{kitchen_id}", response_model=KitchenResponse)
async def update_kitchen(
    kitchen_id: uuid.UUID,
    body: KitchenUpdateRequest,
    current_chef: Chef = Depends(get_current_chef),
    service: KitchenService = Depends(_get_service),
) -> KitchenResponse:
    kitchen = await service.update_kitchen(current_chef, kitchen_id, body)
    return KitchenResponse.model_validate(kitchen)


@router.delete("/{kitchen_id}", status_code=204)
async def archive_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    service: KitchenService = Depends(_get_service),
) -> None:
    await service.archive_kitchen(current_chef, kitchen_id)
