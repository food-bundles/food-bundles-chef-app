"""Suggested requisition for tomorrow (Phase 9, spec screen 11). See app/domain/requisition.py.

Portions per day come from commands (accepted portions, cancelled and declined excluded) and,
for history from before commands existed, the daily sales records.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.domain.calculations import convert_quantity
from app.domain.requisition import average_portions, same_weekdays, suggest
from app.modules.commands.models import Command, CommandLine, CommandShortage
from app.modules.ingredients.models import Ingredient
from app.modules.inventory.repository import InventoryRepository
from app.modules.kitchens.models import Kitchen
from app.modules.menus.models import MenuItem
from app.modules.recipes.repository import RecipeRepository
from app.modules.sales.models import DailySaleRecord
from app.shared.kitchen_time import kitchen_today


class RequisitionLine(BaseModel):
    ingredient_id: uuid.UUID
    catalog_product_id: uuid.UUID | None
    name: str
    unit: str
    left: Decimal
    need: Decimal
    pack_size: Decimal
    suggested_qty: Decimal
    # Food Bundles price per unit (or the chef's own price for a custom ingredient).
    price_per_unit: Decimal | None
    currency: str | None
    fb_price: bool
    line_total: Decimal | None


class RequisitionResponse(BaseModel):
    for_date: date
    lines: list[RequisitionLine]
    items: int
    total: Decimal
    currency: str


class RequisitionService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def suggested(self, kitchen: Kitchen, for_date: date | None = None) -> RequisitionResponse:
        today = kitchen_today(kitchen)
        target = for_date or today + timedelta(days=1)
        days = same_weekdays(target, settings.REQUISITION_SAME_WEEKDAYS)
        portions = await self._portions_by_dish_day(kitchen, min(days), today)

        recipes = RecipeRepository(self._db)
        items = (
            await self._db.execute(
                select(MenuItem).where(MenuItem.kitchen_id == kitchen.id, MenuItem.is_active.is_(True))
            )
        ).scalars().all()
        expected: dict[uuid.UUID, Decimal] = defaultdict(Decimal)
        for item in items:
            avg = average_portions(portions.get(item.id, {}), days)
            if avg <= 0:
                continue
            for line in await recipes.list_for_item(item.id):
                qty = convert_quantity(line.qty_per_portion, line.unit, line.ingredient.unit)
                if qty is not None:
                    expected[line.ingredient_id] += avg * qty

        shortages: dict[uuid.UUID, Decimal] = defaultdict(Decimal)
        for s in (
            await self._db.execute(
                select(CommandShortage).where(
                    CommandShortage.kitchen_id == kitchen.id,
                    CommandShortage.service_date == today,
                    CommandShortage.add_to_requisition.is_(True),
                )
            )
        ).scalars():
            shortages[s.ingredient_id] += s.short_qty

        inventory = InventoryRepository(self._db)
        buffer_pct = Decimal(str(settings.REQUISITION_SAFETY_BUFFER_PCT))
        yld = Decimal(str(settings.REQUISITION_YIELD))
        lines: list[RequisitionLine] = []
        for ing_id in set(expected) | set(shortages):
            ing = await self._db.get(Ingredient, ing_id)
            if ing is None or not ing.is_active:
                continue
            left = await inventory.current_stock(kitchen.id, ing_id)
            s = suggest(
                expected.get(ing_id, Decimal("0")),
                shortages.get(ing_id, Decimal("0")),
                left,
                ing.selling_unit_size,
                buffer_pct,
                yld,
                settings.REQUISITION_ROUND_TO_PACK,
            )
            if s.qty <= 0:
                continue
            price = ing.cost_per_unit
            lines.append(
                RequisitionLine(
                    ingredient_id=ing.id,
                    catalog_product_id=ing.catalog_product_id,
                    name=ing.name,
                    unit=ing.unit,
                    left=left,
                    need=s.need,
                    pack_size=ing.selling_unit_size,
                    suggested_qty=s.qty,
                    price_per_unit=price,
                    currency=ing.cost_per_unit_currency or kitchen.currency,
                    fb_price=ing.catalog_product_id is not None,
                    line_total=(s.qty * price) if price is not None else None,
                )
            )
        lines.sort(key=lambda line: line.name)
        total = sum(
            (line.line_total for line in lines if line.line_total is not None and line.currency == kitchen.currency),
            Decimal("0"),
        )
        return RequisitionResponse(
            for_date=target, lines=lines, items=len(lines), total=total, currency=kitchen.currency
        )

    async def _portions_by_dish_day(
        self, kitchen: Kitchen, since: date, until: date
    ) -> dict[uuid.UUID, dict[date, int]]:
        out: dict[uuid.UUID, dict[date, int]] = defaultdict(lambda: defaultdict(int))
        excluded = settings.ORDERED_TODAY_EXCLUDES
        rows = await self._db.execute(
            select(Command.service_date, CommandLine.menu_item_id, CommandLine.qty, CommandLine.accepted_qty)
            .join(Command, Command.id == CommandLine.command_id)
            .where(
                Command.kitchen_id == kitchen.id,
                Command.service_date >= since,
                Command.service_date <= until,
                Command.status.not_in(excluded),
            )
        )
        command_days: set[tuple[uuid.UUID, date]] = set()
        for day, dish, qty, accepted in rows.all():
            out[dish][day] += accepted if accepted is not None else qty
            command_days.add((dish, day))
        sales = await self._db.execute(
            select(DailySaleRecord.sale_date, DailySaleRecord.menu_item_id, DailySaleRecord.portions_sold).where(
                DailySaleRecord.kitchen_id == kitchen.id,
                DailySaleRecord.sale_date >= since,
                DailySaleRecord.sale_date <= until,
            )
        )
        for day, dish, sold in sales.all():
            if (dish, day) not in command_days:  # commands win over the old sales entry
                out[dish][day] += sold
        return out
