"""Today's stock and Count (Phase 9, spec screen 10). See app/domain/stock_day.py."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.domain.stock_day import average_service_use, low_level, stock_day
from app.modules.commands.models import Command, CommandLine
from app.modules.ingredients.models import Ingredient
from app.modules.inventory.models import InventoryEntry
from app.modules.kitchens.models import Kitchen
from app.modules.recipes.repository import RecipeRepository
from app.shared.kitchen_time import kitchen_today

CountReason = Literal["waste", "spoilage", "error"]
_HISTORY_DAYS = 7


class StockDayRow(BaseModel):
    ingredient_id: uuid.UUID
    name: str
    unit: str
    start: Decimal
    received: Decimal
    used: Decimal
    counted: Decimal
    left: Decimal
    # 'ok' | 'low' (amber) | 'very_low' (red)
    level: str
    avg_service_use: Decimal | None


class StockDayResponse(BaseModel):
    day: date
    rows: list[StockDayRow]


class CountRequest(BaseModel):
    ingredient_id: uuid.UUID
    counted: Decimal = Field(..., ge=0)
    reason: CountReason = "error"


class UsedByRow(BaseModel):
    menu_item_id: uuid.UUID
    dish_name: str
    portions: int
    quantity: Decimal


class StockDayService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def _day_bounds(self, kitchen: Kitchen, day: date) -> tuple[datetime, datetime]:
        """The kitchen-local day as UTC instants."""
        from zoneinfo import ZoneInfo

        tz = ZoneInfo(kitchen.timezone) if kitchen.timezone else UTC
        start = datetime.combine(day, time.min, tzinfo=tz).astimezone(UTC)
        return start, start + timedelta(days=1)

    async def today(self, kitchen: Kitchen, day: date | None = None) -> StockDayResponse:
        day = day or kitchen_today(kitchen)
        day_start, day_end = self._day_bounds(kitchen, day)
        history_start, _ = self._day_bounds(kitchen, day - timedelta(days=_HISTORY_DAYS))
        ingredients = (
            await self._db.execute(
                select(Ingredient)
                .where(Ingredient.kitchen_id == kitchen.id, Ingredient.is_active.is_(True))
                .order_by(Ingredient.name)
            )
        ).scalars().all()
        entries = (
            await self._db.execute(
                select(InventoryEntry)
                .where(InventoryEntry.kitchen_id == kitchen.id, InventoryEntry.recorded_at < day_end)
                .order_by(InventoryEntry.recorded_at, InventoryEntry.id)
            )
        ).scalars().all()
        by_ing: dict[uuid.UUID, list[InventoryEntry]] = defaultdict(list)
        for e in entries:
            by_ing[e.ingredient_id].append(e)

        low_f = Decimal(str(settings.STOCK_LOW_FACTOR))
        very_f = Decimal(str(settings.STOCK_VERY_LOW_FACTOR))
        rows = []
        for ing in ingredients:
            history = by_ing.get(ing.id, [])
            before = [e for e in history if _at(e) < day_start]
            during = [e for e in history if _at(e) >= day_start]
            start = before[-1].quantity if before else Decimal("0")
            sd = stock_day(start, [(e.entry_type, e.quantity) for e in during])
            avg = average_service_use(self._daily_used(before, history_start, kitchen))
            rows.append(
                StockDayRow(
                    ingredient_id=ing.id,
                    name=ing.name,
                    unit=ing.unit,
                    start=sd.start,
                    received=sd.received,
                    used=sd.used,
                    counted=sd.counted,
                    left=sd.left,
                    level=low_level(sd.left, avg, low_f, very_f),
                    avg_service_use=avg,
                )
            )
        return StockDayResponse(day=day, rows=rows)

    def _daily_used(
        self, entries: list[InventoryEntry], since: datetime, kitchen: Kitchen
    ) -> list[Decimal]:
        """Used per day over the history window (deductions only)."""
        from zoneinfo import ZoneInfo

        tz = ZoneInfo(kitchen.timezone) if kitchen.timezone else UTC
        per_day: dict[date, Decimal] = defaultdict(Decimal)
        previous: Decimal | None = None
        for e in entries:
            if previous is not None and _at(e) >= since and e.entry_type in ("command_use", "sale_use"):
                per_day[_at(e).astimezone(tz).date()] += max(previous - e.quantity, Decimal("0"))
            previous = e.quantity
        return list(per_day.values())

    async def count(
        self,
        kitchen: Kitchen,
        chef_id: uuid.UUID,
        ingredient_id: uuid.UUID,
        counted: Decimal,
        reason: str,
    ) -> InventoryEntry:
        """A physical count: Left becomes the count; the difference is the adjustment."""
        ing = await self._db.get(Ingredient, ingredient_id)
        if ing is None or ing.kitchen_id != kitchen.id:
            raise NotFoundError("Ingredient not found in this kitchen.")
        entry = InventoryEntry(
            kitchen_id=kitchen.id,
            ingredient_id=ingredient_id,
            quantity=counted,
            entry_type="count",
            notes=f"count: {reason}",
            recorded_by=chef_id,
        )
        self._db.add(entry)
        await self._db.flush()
        return entry

    async def used_by(self, kitchen: Kitchen, ingredient_id: uuid.UUID) -> list[UsedByRow]:
        """Dishes that used this ingredient today (accepted portions of today's commands)."""
        day = kitchen_today(kitchen)
        lines = (
            await self._db.execute(
                select(CommandLine, Command.status)
                .join(Command, Command.id == CommandLine.command_id)
                .where(
                    Command.kitchen_id == kitchen.id,
                    Command.service_date == day,
                    Command.stock_deducted.is_(True),
                    Command.status.not_in(["cancelled", "declined"]),
                )
            )
        ).all()
        recipes = RecipeRepository(self._db)
        portions: dict[uuid.UUID, tuple[str, int]] = {}
        for line, _status in lines:
            name, n = portions.get(line.menu_item_id, (line.dish_name, 0))
            portions[line.menu_item_id] = (name, n + (line.accepted_qty or line.qty))
        out = []
        for menu_item_id, (name, n) in portions.items():
            for r in await recipes.list_for_item(menu_item_id):
                if r.ingredient_id == ingredient_id:
                    out.append(
                        UsedByRow(
                            menu_item_id=menu_item_id,
                            dish_name=name,
                            portions=n,
                            quantity=r.qty_per_portion * n,
                        )
                    )
        return sorted(out, key=lambda r: r.quantity, reverse=True)


def _at(entry: InventoryEntry) -> datetime:
    at = entry.recorded_at
    return at if at.tzinfo else at.replace(tzinfo=UTC)
