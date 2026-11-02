"""Purchasing suggestion service.

Applies the deterministic demand → order quantity pipeline:
1. Load last 4 weeks of sales per menu item
2. Compute weighted_demand per item (mobile formula aligned)
3. For each ingredient, aggregate demand across all menu items that use it
4. Compute purchase_quantity using stock on hand, yield, selling unit, buffer
5. Return PurchaseSuggestion list ordered by is_low_stock desc, then name
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.calculations import (
    days_cover as calc_days_cover,
    expected_daily_use,
    is_low_stock,
    purchase_quantity,
    weighted_demand,
)
from app.modules.ingredients.repository import IngredientRepository
from app.modules.inventory.repository import InventoryRepository
from app.modules.kitchens.models import Kitchen
from app.modules.menus.repository import MenuItemRepository
from app.modules.purchasing.schemas import PurchaseSuggestion, PurchaseSuggestionsResponse
from app.modules.recipes.repository import RecipeRepository
from app.modules.sales.repository import SalesRepository

_ZERO = Decimal("0")


class PurchasingService:
    def __init__(self, db: AsyncSession) -> None:
        self._ingredient_repo = IngredientRepository(db)
        self._inventory_repo = InventoryRepository(db)
        self._recipe_repo = RecipeRepository(db)
        self._sales_repo = SalesRepository(db)
        self._item_repo = MenuItemRepository(db)

    async def get_suggestions(self, kitchen: Kitchen) -> PurchaseSuggestionsResponse:
        ingredients = await self._ingredient_repo.list_for_kitchen(kitchen.id, active_only=True)
        if not ingredients:
            return PurchaseSuggestionsResponse(kitchen_id=kitchen.id, suggestions=[])

        # Map ingredient_id → aggregate weighted demand portions
        ingredient_demand: dict[uuid.UUID, Decimal] = defaultdict(lambda: _ZERO)

        # For each active menu item, get last-4-week sales and recipe lines
        items = await self._item_repo.list_for_menu_all(kitchen.id)
        for item in items:
            weekly = await self._sales_repo.weekly_totals(kitchen.id, item.id, weeks=4)
            if not any(total > 0 for _, total in weekly):
                continue  # no sales history → skip this item's demand

            portions = [Decimal(str(t)) for _, t in weekly]
            demand = weighted_demand(portions)

            lines = await self._recipe_repo.list_for_item(item.id)
            for line in lines:
                eff_yield = line.yield_fraction_override or line.ingredient.yield_fraction
                # Scale demand to ingredient raw quantity needed
                raw_need_per_portion = line.qty_per_portion / eff_yield
                ingredient_demand[line.ingredient_id] += demand * raw_need_per_portion

        # Build suggestions
        suggestions: list[PurchaseSuggestion] = []
        for ing in ingredients:
            stock = await self._inventory_repo.current_stock(kitchen.id, ing.id)
            demand_qty = ingredient_demand.get(ing.id, _ZERO)

            # daily_use from actual demand (not placeholder)
            days_open = ing.days_open_per_week or 7
            daily = _ZERO
            if demand_qty > _ZERO and days_open > 0:
                # demand_qty is already in ingredient units; derive daily rate
                daily = (demand_qty / Decimal(days_open)).quantize(Decimal("0.0001"))

            cover = calc_days_cover(stock, daily) if daily > _ZERO else None

            # Derive expected_portions from demand_qty back to portion units
            # for the purchase_quantity formula:
            # demand_qty = demand_portions * qty_per_portion / yield
            # We pass demand_qty directly as expected_portions with qty=1, yield=1
            # because the ingredient-level aggregation already applied yield.
            suggested = purchase_quantity(
                expected_portions=demand_qty,
                qty_per_portion=Decimal("1"),
                yield_fraction=Decimal("1"),
                current_stock=stock,
                selling_unit_size=ing.selling_unit_size,
                safety_buffer_fraction=ing.safety_buffer_fraction,
            )

            cost_est: Decimal | None = None
            if ing.cost_per_unit is not None and suggested > _ZERO:
                cost_est = (suggested * ing.cost_per_unit).quantize(Decimal("0.01"))

            suggestions.append(
                PurchaseSuggestion(
                    ingredient_id=ing.id,
                    ingredient_name=ing.name,
                    unit=ing.unit,
                    current_stock=stock,
                    expected_daily_use=daily,
                    days_cover=cover,
                    is_low_stock=is_low_stock(cover),
                    weighted_demand_portions=demand_qty,
                    suggested_qty=suggested,
                    selling_unit_size=ing.selling_unit_size,
                    estimated_cost=cost_est,
                )
            )

        # Low stock first, then alphabetical
        suggestions.sort(key=lambda s: (not s.is_low_stock, s.ingredient_name))
        return PurchaseSuggestionsResponse(kitchen_id=kitchen.id, suggestions=suggestions)
