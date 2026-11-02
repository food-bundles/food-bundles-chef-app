from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.domain.calculations import (
    days_cover as calc_days_cover,
)
from app.domain.calculations import (
    expected_daily_use,
    is_low_stock,
)
from app.modules.ingredients.models import Ingredient
from app.modules.ingredients.repository import IngredientRepository
from app.modules.inventory.models import InventoryEntry
from app.modules.inventory.repository import InventoryRepository
from app.modules.inventory.schemas import (
    InventoryEntryCreateRequest,
    StockLevelResponse,
)
from app.modules.kitchens.models import Kitchen


class InventoryService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = InventoryRepository(db)
        self._ingredient_repo = IngredientRepository(db)

    async def record_stock(
        self,
        kitchen: Kitchen,
        chef_id: uuid.UUID,
        data: InventoryEntryCreateRequest,
    ) -> InventoryEntry:
        ingredient = await self._ingredient_repo.get_by_id_and_kitchen(
            data.ingredient_id, kitchen.id
        )
        if ingredient is None:
            raise NotFoundError("Ingredient not found in this kitchen.")

        entry = InventoryEntry(
            kitchen_id=kitchen.id,
            ingredient_id=data.ingredient_id,
            quantity=data.quantity,
            entry_type=data.entry_type,
            notes=data.notes,
            recorded_by=chef_id,
        )
        return await self._repo.create(entry)

    async def get_stock_levels(self, kitchen: Kitchen) -> list[StockLevelResponse]:
        """Return current stock level + derived metrics for all active ingredients."""
        ingredients = await self._ingredient_repo.list_for_kitchen(
            kitchen.id, active_only=True
        )
        levels: list[StockLevelResponse] = []
        for ing in ingredients:
            stock = await self._repo.current_stock(kitchen.id, ing.id)
            latest = await self._repo.latest_for_ingredient(kitchen.id, ing.id)
            daily_use = _compute_daily_use(ing, stock)
            cover = calc_days_cover(stock, daily_use) if daily_use else None
            levels.append(
                StockLevelResponse(
                    ingredient_id=ing.id,
                    ingredient_name=ing.name,
                    unit=ing.unit,
                    current_stock=stock,
                    expected_daily_use=daily_use,
                    days_cover=cover,
                    is_low_stock=is_low_stock(cover),
                    last_recorded_at=latest.recorded_at if latest else None,
                )
            )
        return levels

    async def get_ingredient_history(
        self,
        kitchen: Kitchen,
        ingredient_id: uuid.UUID,
        limit: int = 50,
    ) -> list[InventoryEntry]:
        ingredient = await self._ingredient_repo.get_by_id_and_kitchen(
            ingredient_id, kitchen.id
        )
        if ingredient is None:
            raise NotFoundError("Ingredient not found in this kitchen.")
        return await self._repo.list_for_ingredient(kitchen.id, ingredient_id, limit)


def _compute_daily_use(ing: Ingredient, _stock: Decimal) -> Decimal:
    """Estimate daily use from ingredient defaults using a neutral 1-week demand."""
    if ing.qty_per_portion <= Decimal("0") or ing.days_open_per_week < 1:
        return Decimal("0")
    # Without sales history we assume 1 portion/day as a placeholder
    # (real demand is supplied by the purchasing service using sales data)
    try:
        return expected_daily_use(
            weekly_sales=Decimal(ing.days_open_per_week),  # 1 portion per open day
            days_open=ing.days_open_per_week,
            qty_per_portion=ing.qty_per_portion,
            yield_fraction=ing.yield_fraction,
        )
    except (ValueError, ZeroDivisionError):
        return Decimal("0")
