from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.domain.calculations import convert_quantity, portion_usage
from app.modules.inventory.models import InventoryEntry
from app.modules.inventory.repository import InventoryRepository
from app.modules.kitchens.models import Kitchen
from app.modules.menus.repository import MenuItemRepository
from app.modules.recipes.repository import RecipeRepository
from app.modules.sales.models import DailySaleRecord
from app.modules.sales.repository import SalesRepository
from app.modules.sales.schemas import (
    DailySaleRecordRequest,
    WeeklySalesSummary,
    WeeklyTotal,
)
from app.shared.kitchen_time import kitchen_today

logger = structlog.get_logger(__name__)

# Inventory entry type written when sales consume recipe ingredients.
SALE_USE_ENTRY_TYPE = "sale_use"
_ZERO = Decimal("0")


class SalesService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = SalesRepository(db)
        self._item_repo = MenuItemRepository(db)
        self._recipe_repo = RecipeRepository(db)
        self._inventory_repo = InventoryRepository(db)

    async def record_sale(
        self,
        kitchen: Kitchen,
        chef_id: uuid.UUID,
        data: DailySaleRecordRequest,
    ) -> DailySaleRecord:
        """Upsert the day's portions for a menu item and deduct recipe usage from stock.

        Only the change in portions is applied, so re-saving the same day (or correcting
        10 → 8) never double-deducts: 10 then 8 portions of a 0.25 kg recipe leaves
        stock 2.0 kg lower, not 4.5 kg.
        """
        item = await self._item_repo.get_by_id_and_kitchen(data.menu_item_id, kitchen.id)
        if item is None:
            raise NotFoundError("Menu item not found in this kitchen.")

        previous = await self._repo.portions_for_day(kitchen.id, data.menu_item_id, data.sale_date)
        record = await self._repo.upsert(
            kitchen_id=kitchen.id,
            menu_item_id=data.menu_item_id,
            sale_date=data.sale_date,
            portions_sold=data.portions_sold,
            recorded_by=chef_id,
        )

        delta = Decimal(data.portions_sold - previous)
        if delta != _ZERO:
            await self._apply_recipe_usage(
                kitchen, chef_id, item.id, item.name, delta, data.sale_date.isoformat()
            )
        return record

    async def _apply_recipe_usage(
        self,
        kitchen: Kitchen,
        chef_id: uuid.UUID,
        menu_item_id: uuid.UUID,
        menu_item_name: str,
        portions_delta: Decimal,
        sale_date: str,
    ) -> None:
        lines = await self._recipe_repo.list_for_item(menu_item_id)
        for line in lines:
            ing = line.ingredient
            qty = convert_quantity(line.qty_per_portion, line.unit, ing.unit)
            if qty is None:
                # Incompatible units (e.g. recipe in pieces, stock in kg): never guess.
                logger.warning(
                    "sale_usage_unit_mismatch",
                    kitchen_id=str(kitchen.id),
                    ingredient_id=str(ing.id),
                )
                continue
            yld = line.yield_fraction_override or ing.yield_fraction
            usage = portion_usage(portions_delta, qty, yld)
            current = await self._inventory_repo.current_stock(kitchen.id, ing.id)
            new_stock = max(current - usage, _ZERO)
            await self._inventory_repo.create(
                InventoryEntry(
                    kitchen_id=kitchen.id,
                    ingredient_id=ing.id,
                    quantity=new_stock,
                    entry_type=SALE_USE_ENTRY_TYPE,
                    notes=f"Sales {sale_date}: {portions_delta:+} x {menu_item_name}",
                    recorded_by=chef_id,
                )
            )

    async def get_weekly_summary(
        self,
        kitchen: Kitchen,
        menu_item_id: uuid.UUID,
        weeks: int = 4,
    ) -> WeeklySalesSummary:
        item = await self._item_repo.get_by_id_and_kitchen(menu_item_id, kitchen.id)
        if item is None:
            raise NotFoundError("Menu item not found in this kitchen.")

        weekly = await self._repo.weekly_totals(
            kitchen.id, menu_item_id, weeks=weeks, reference_date=kitchen_today(kitchen)
        )
        return WeeklySalesSummary(
            menu_item_id=menu_item_id,
            menu_item_name=item.name,
            weeks=[WeeklyTotal(week_start=ws, total_portions=total) for ws, total in weekly],
        )

    async def daily_revenue(self, kitchen: Kitchen, day: date) -> tuple[int, Decimal]:
        """Portions and revenue for one day, priced at each item's current selling price.

        Sales records do not snapshot the price, so a price changed later in the day
        re-prices that day's portions — acceptable for a same-day dashboard figure.
        """
        rows = await self._repo.day_totals_with_price(kitchen.id, day)
        portions = sum(p for p, _ in rows)
        revenue = sum((Decimal(p) * price for p, price in rows), _ZERO)
        return portions, revenue.quantize(Decimal("1"))
