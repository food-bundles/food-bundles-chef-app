from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.domain.calculations import recipe_cost
from app.modules.ingredients.repository import IngredientRepository
from app.modules.kitchens.models import Kitchen
from app.modules.menus.repository import MenuItemRepository
from app.modules.recipes.models import RecipeLine
from app.modules.recipes.repository import RecipeRepository
from app.modules.recipes.schemas import (
    RecipeCostResponse,
    RecipeLineCostDetail,
    RecipeLineCreateRequest,
    RecipeLineUpdateRequest,
)


class RecipeService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = RecipeRepository(db)
        self._item_repo = MenuItemRepository(db)
        self._ingredient_repo = IngredientRepository(db)

    async def list_lines(
        self, kitchen: Kitchen, menu_item_id: uuid.UUID
    ) -> list[RecipeLine]:
        await self._require_item(kitchen, menu_item_id)
        return await self._repo.list_for_item(menu_item_id)

    async def add_line(
        self,
        kitchen: Kitchen,
        menu_item_id: uuid.UUID,
        data: RecipeLineCreateRequest,
    ) -> RecipeLine:
        await self._require_item(kitchen, menu_item_id)
        ingredient = await self._ingredient_repo.get_by_id_and_kitchen(
            data.ingredient_id, kitchen.id
        )
        if ingredient is None:
            raise NotFoundError("Ingredient not found in this kitchen.")

        line = RecipeLine(
            menu_item_id=menu_item_id,
            ingredient_id=data.ingredient_id,
            qty_per_portion=data.qty_per_portion,
            yield_fraction_override=data.yield_fraction_override,
            unit=data.unit,
            notes=data.notes,
        )
        return await self._repo.create(line)

    async def update_line(
        self,
        kitchen: Kitchen,
        menu_item_id: uuid.UUID,
        line_id: uuid.UUID,
        data: RecipeLineUpdateRequest,
    ) -> RecipeLine:
        await self._require_item(kitchen, menu_item_id)
        line = await self._repo.get_by_id(line_id)
        if line is None or line.menu_item_id != menu_item_id:
            raise NotFoundError("Recipe line not found.")
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(line, field, value)
        return await self._repo.update(line)

    async def delete_line(
        self,
        kitchen: Kitchen,
        menu_item_id: uuid.UUID,
        line_id: uuid.UUID,
    ) -> None:
        await self._require_item(kitchen, menu_item_id)
        line = await self._repo.get_by_id(line_id)
        if line is None or line.menu_item_id != menu_item_id:
            raise NotFoundError("Recipe line not found.")
        await self._repo.delete(line)

    async def calculate_cost(
        self, kitchen: Kitchen, menu_item_id: uuid.UUID
    ) -> RecipeCostResponse:
        """Deterministic per-portion cost using Decimal arithmetic."""
        await self._require_item(kitchen, menu_item_id)
        lines = await self._repo.list_for_item(menu_item_id)

        cost_lines: list[tuple[Decimal, Decimal, Decimal]] = []
        details: list[RecipeLineCostDetail] = []

        for line in lines:
            ing = line.ingredient
            yld = line.yield_fraction_override or ing.yield_fraction
            cost = ing.cost_per_unit

            line_cost: Decimal | None = None
            if cost is not None and yld > Decimal("0"):
                line_cost = (line.qty_per_portion / yld * cost).quantize(
                    Decimal("0.01")
                )
                cost_lines.append((line.qty_per_portion, yld, cost))

            details.append(
                RecipeLineCostDetail(
                    ingredient_id=ing.id,
                    ingredient_name=ing.name,
                    qty_per_portion=line.qty_per_portion,
                    yield_fraction=yld,
                    cost_per_unit=cost,
                    line_cost=line_cost,
                )
            )

        total = recipe_cost(cost_lines) if cost_lines else Decimal("0.00")

        return RecipeCostResponse(
            menu_item_id=menu_item_id,
            total_cost=total,
            lines=details,
        )

    async def _require_item(self, kitchen: Kitchen, item_id: uuid.UUID) -> None:
        item = await self._item_repo.get_by_id_and_kitchen(item_id, kitchen.id)
        if item is None:
            raise NotFoundError("Menu item not found.")
