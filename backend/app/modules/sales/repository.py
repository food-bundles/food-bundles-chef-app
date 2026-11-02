from __future__ import annotations

import uuid
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.sales.models import DailySaleRecord


class SalesRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def upsert(
        self,
        kitchen_id: uuid.UUID,
        menu_item_id: uuid.UUID,
        sale_date: date,
        portions_sold: int,
        recorded_by: uuid.UUID | None,
    ) -> DailySaleRecord:
        """Insert or update portions_sold for the given day."""
        existing = await self._get_exact(kitchen_id, menu_item_id, sale_date)
        if existing is not None:
            existing.portions_sold = portions_sold
            existing.recorded_by = recorded_by
            await self._db.flush()
            await self._db.refresh(existing)
            return existing

        record = DailySaleRecord(
            kitchen_id=kitchen_id,
            menu_item_id=menu_item_id,
            sale_date=sale_date,
            portions_sold=portions_sold,
            recorded_by=recorded_by,
        )
        self._db.add(record)
        await self._db.flush()
        await self._db.refresh(record)
        return record

    async def weekly_totals(
        self,
        kitchen_id: uuid.UUID,
        menu_item_id: uuid.UUID,
        weeks: int = 4,
        reference_date: date | None = None,
    ) -> list[tuple[date, int]]:
        """Return (week_start, total_portions) for the last `weeks` weeks.

        Week starts on Monday. Returns most recent week first.
        """
        ref = reference_date or date.today()
        # Start of the most recent complete week (last Monday)
        days_since_monday = ref.weekday()
        week_start = ref - timedelta(days=days_since_monday + 7)  # last full week

        results: list[tuple[date, int]] = []
        for i in range(weeks):
            ws = week_start - timedelta(weeks=i)
            we = ws + timedelta(days=6)
            total = await self._sum_range(kitchen_id, menu_item_id, ws, we)
            results.append((ws, total))
        return results  # most recent first

    async def _get_exact(
        self,
        kitchen_id: uuid.UUID,
        menu_item_id: uuid.UUID,
        sale_date: date,
    ) -> DailySaleRecord | None:
        result = await self._db.execute(
            select(DailySaleRecord).where(
                DailySaleRecord.kitchen_id == kitchen_id,
                DailySaleRecord.menu_item_id == menu_item_id,
                DailySaleRecord.sale_date == sale_date,
            )
        )
        return result.scalar_one_or_none()

    async def _sum_range(
        self,
        kitchen_id: uuid.UUID,
        menu_item_id: uuid.UUID,
        start: date,
        end: date,
    ) -> int:
        result = await self._db.execute(
            select(func.coalesce(func.sum(DailySaleRecord.portions_sold), 0)).where(
                DailySaleRecord.kitchen_id == kitchen_id,
                DailySaleRecord.menu_item_id == menu_item_id,
                DailySaleRecord.sale_date >= start,
                DailySaleRecord.sale_date <= end,
            )
        )
        return int(result.scalar_one())
