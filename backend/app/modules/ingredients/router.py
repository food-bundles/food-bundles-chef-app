from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.ingredients.schemas import (
    IngredientCreateRequest,
    IngredientResponse,
    IngredientUpdateRequest,
)
from app.modules.ingredients.service import IngredientService
from app.modules.kitchens.service import KitchenService

router = APIRouter(prefix="/kitchens/{kitchen_id}/ingredients", tags=["ingredients"])


async def _get_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
):
    svc = KitchenService(db)
    return await svc.get_kitchen(current_chef, kitchen_id)


@router.get("", response_model=list[IngredientResponse])
async def list_ingredients(
    kitchen=Depends(_get_kitchen),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
) -> list[IngredientResponse]:
    svc = IngredientService(db)
    items = await svc.list_ingredients(kitchen, active_only=active_only)
    return [IngredientResponse.model_validate(i) for i in items]


@router.post("", response_model=IngredientResponse, status_code=201)
async def create_ingredient(
    body: IngredientCreateRequest,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> IngredientResponse:
    svc = IngredientService(db)
    ingredient = await svc.create_ingredient(kitchen, body)
    return IngredientResponse.model_validate(ingredient)


@router.get("/{ingredient_id}", response_model=IngredientResponse)
async def get_ingredient(
    ingredient_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> IngredientResponse:
    svc = IngredientService(db)
    ingredient = await svc.get_ingredient(kitchen, ingredient_id)
    return IngredientResponse.model_validate(ingredient)


@router.patch("/{ingredient_id}", response_model=IngredientResponse)
async def update_ingredient(
    ingredient_id: uuid.UUID,
    body: IngredientUpdateRequest,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> IngredientResponse:
    svc = IngredientService(db)
    ingredient = await svc.update_ingredient(kitchen, ingredient_id, body)
    return IngredientResponse.model_validate(ingredient)


@router.delete("/{ingredient_id}", status_code=204)
async def deactivate_ingredient(
    ingredient_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> None:
    svc = IngredientService(db)
    await svc.deactivate_ingredient(kitchen, ingredient_id)
