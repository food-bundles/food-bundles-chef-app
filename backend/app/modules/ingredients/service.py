from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import KitchenAccessDeniedError, NotFoundError
from app.modules.ingredients.models import Ingredient
from app.modules.ingredients.repository import IngredientRepository
from app.modules.ingredients.schemas import IngredientCreateRequest, IngredientUpdateRequest
from app.modules.kitchens.models import Kitchen
from app.shared.money_fields import check_unit_cost, resolve_cost_currency


class IngredientService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = IngredientRepository(db)

    async def list_ingredients(
        self, kitchen: Kitchen, active_only: bool = True
    ) -> list[Ingredient]:
        return await self._repo.list_for_kitchen(kitchen.id, active_only=active_only)

    async def create_ingredient(
        self, kitchen: Kitchen, data: IngredientCreateRequest
    ) -> Ingredient:
        ingredient = Ingredient(
            kitchen_id=kitchen.id,
            name=data.name,
            unit=data.unit,
            yield_fraction=data.yield_fraction,
            qty_per_portion=data.qty_per_portion,
            cost_per_unit=check_unit_cost(data.cost_per_unit),
            cost_per_unit_currency=(
                resolve_cost_currency(kitchen, data.cost_per_unit_currency)
                if data.cost_per_unit is not None
                else None
            ),
            selling_unit_size=data.selling_unit_size,
            days_open_per_week=data.days_open_per_week,
            safety_buffer_fraction=data.safety_buffer_fraction,
            notes=data.notes,
        )
        return await self._repo.create(ingredient)

    async def get_ingredient(self, kitchen: Kitchen, ingredient_id: uuid.UUID) -> Ingredient:
        return await self._require_owned(kitchen, ingredient_id)

    async def update_ingredient(
        self,
        kitchen: Kitchen,
        ingredient_id: uuid.UUID,
        data: IngredientUpdateRequest,
    ) -> Ingredient:
        ingredient = await self._require_owned(kitchen, ingredient_id)
        changes = data.model_dump(exclude_none=True)
        requested_currency = changes.pop("cost_per_unit_currency", None)
        if "cost_per_unit" in changes:
            changes["cost_per_unit"] = check_unit_cost(changes["cost_per_unit"])
        for field, value in changes.items():
            setattr(ingredient, field, value)
        if "cost_per_unit" in changes or requested_currency is not None:
            # A bare amount (no currency sent) is in the kitchen's currency, as before.
            ingredient.cost_per_unit_currency = resolve_cost_currency(
                kitchen, requested_currency, current=ingredient.cost_per_unit_currency
            )
        return await self._repo.update(ingredient)

    async def deactivate_ingredient(self, kitchen: Kitchen, ingredient_id: uuid.UUID) -> Ingredient:
        ingredient = await self._require_owned(kitchen, ingredient_id)
        ingredient.is_active = False
        return await self._repo.update(ingredient)

    async def _require_owned(self, kitchen: Kitchen, ingredient_id: uuid.UUID) -> Ingredient:
        ingredient = await self._repo.get_by_id_and_kitchen(ingredient_id, kitchen.id)
        if ingredient is None:
            exists = await self._repo.get_by_id(ingredient_id)
            if exists is None:
                raise NotFoundError("Ingredient not found.")
            raise KitchenAccessDeniedError()
        return ingredient
