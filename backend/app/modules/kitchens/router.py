from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.kitchens.currency_change import CurrencyChangeService
from app.modules.kitchens.currency_schemas import (
    CurrencyChangeLogEntry,
    CurrencyChangePreviewRequest,
    CurrencyChangePreviewResponse,
    CurrencyChangeRequest,
    CurrencyChangeResponse,
)
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


@router.post("/{kitchen_id}/currency-change/preview", response_model=CurrencyChangePreviewResponse)
async def preview_currency_change(
    kitchen_id: uuid.UUID,
    body: CurrencyChangePreviewRequest,
    current_chef: Chef = Depends(get_current_chef),
    service: KitchenService = Depends(_get_service),
    db: AsyncSession = Depends(get_db),
) -> CurrencyChangePreviewResponse:
    """Before/after prices, the rate (convert) and the kitchen's history. Changes nothing."""
    kitchen = await service.get_kitchen(current_chef, kitchen_id)
    return await CurrencyChangeService(db).preview(kitchen, body)


@router.post("/{kitchen_id}/currency-change", response_model=CurrencyChangeResponse)
async def change_currency(
    kitchen_id: uuid.UUID,
    body: CurrencyChangeRequest,
    current_chef: Chef = Depends(get_current_chef),
    service: KitchenService = Depends(_get_service),
    db: AsyncSession = Depends(get_db),
) -> CurrencyChangeResponse:
    """Convert at the previewed rate, or relabel with the typed confirmation. Audited."""
    kitchen = await service.get_kitchen(current_chef, kitchen_id)
    return await CurrencyChangeService(db).apply(kitchen, current_chef, body)


@router.get("/{kitchen_id}/currency-changes", response_model=list[CurrencyChangeLogEntry])
async def list_currency_changes(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    service: KitchenService = Depends(_get_service),
    db: AsyncSession = Depends(get_db),
) -> list[CurrencyChangeLogEntry]:
    """Who changed the kitchen's currency, when, and how (newest first)."""
    kitchen = await service.get_kitchen(current_chef, kitchen_id)
    return await CurrencyChangeService(db).log(kitchen)


@router.delete("/{kitchen_id}", status_code=204, response_model=None)
async def archive_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    service: KitchenService = Depends(_get_service),
) -> None:
    await service.archive_kitchen(current_chef, kitchen_id)
