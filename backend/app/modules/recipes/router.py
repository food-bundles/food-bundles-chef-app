from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.kitchens.service import KitchenService
from app.modules.recipes.schemas import (
    RecipeCostResponse,
    RecipeLineCreateRequest,
    RecipeLineResponse,
    RecipeLineUpdateRequest,
)
from app.modules.recipes.service import RecipeService

router = APIRouter(
    prefix="/kitchens/{kitchen_id}/menu-items/{menu_item_id}/recipe",
    tags=["recipes"],
)


async def _get_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
):
    svc = KitchenService(db)
    return await svc.get_kitchen(current_chef, kitchen_id)


@router.get("", response_model=list[RecipeLineResponse])
async def list_recipe_lines(
    menu_item_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> list[RecipeLineResponse]:
    svc = RecipeService(db)
    lines = await svc.list_lines(kitchen, menu_item_id)
    return [RecipeLineResponse.model_validate(line) for line in lines]


@router.post("", response_model=RecipeLineResponse, status_code=201)
async def add_recipe_line(
    menu_item_id: uuid.UUID,
    body: RecipeLineCreateRequest,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> RecipeLineResponse:
    svc = RecipeService(db)
    line = await svc.add_line(kitchen, menu_item_id, body)
    return RecipeLineResponse.model_validate(line)


@router.patch("/{line_id}", response_model=RecipeLineResponse)
async def update_recipe_line(
    menu_item_id: uuid.UUID,
    line_id: uuid.UUID,
    body: RecipeLineUpdateRequest,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> RecipeLineResponse:
    svc = RecipeService(db)
    line = await svc.update_line(kitchen, menu_item_id, line_id, body)
    return RecipeLineResponse.model_validate(line)


@router.delete("/{line_id}", status_code=204, response_model=None)
async def delete_recipe_line(
    menu_item_id: uuid.UUID,
    line_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> None:
    svc = RecipeService(db)
    await svc.delete_line(kitchen, menu_item_id, line_id)


@router.get("/cost", response_model=RecipeCostResponse)
async def get_recipe_cost(
    menu_item_id: uuid.UUID,
    kitchen=Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> RecipeCostResponse:
    svc = RecipeService(db)
    return await svc.calculate_cost(kitchen, menu_item_id)
