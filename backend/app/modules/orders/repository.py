from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.orders.models import Order, OrderLine
from app.shared.enums import OrderStatus


class OrderRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, order_id: uuid.UUID) -> Order | None:
        result = await self._db.execute(select(Order).where(Order.id == order_id))
        return result.scalar_one_or_none()

    async def get_with_lines(self, order_id: uuid.UUID) -> Order | None:
        result = await self._db.execute(
            select(Order)
            .where(Order.id == order_id)
            .options(selectinload(Order.lines))
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_kitchen(
        self, order_id: uuid.UUID, kitchen_id: uuid.UUID
    ) -> Order | None:
        result = await self._db.execute(
            select(Order).where(
                Order.id == order_id, Order.kitchen_id == kitchen_id
            )
        )
        return result.scalar_one_or_none()

    async def list_for_kitchen(
        self, kitchen_id: uuid.UUID, status: OrderStatus | None = None
    ) -> list[Order]:
        q = select(Order).where(Order.kitchen_id == kitchen_id)
        if status is not None:
            q = q.where(Order.status == status)
        q = q.order_by(Order.created_at.desc())
        result = await self._db.execute(q)
        return list(result.scalars().all())

    async def create(self, order: Order) -> Order:
        self._db.add(order)
        await self._db.flush()
        await self._db.refresh(order)
        return order

    async def update(self, order: Order) -> Order:
        await self._db.flush()
        await self._db.refresh(order)
        return order


class OrderLineRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, line_id: uuid.UUID) -> OrderLine | None:
        result = await self._db.execute(
            select(OrderLine).where(OrderLine.id == line_id)
        )
        return result.scalar_one_or_none()

    async def create_many(self, lines: list[OrderLine]) -> list[OrderLine]:
        for line in lines:
            self._db.add(line)
        await self._db.flush()
        for line in lines:
            await self._db.refresh(line)
        return lines
