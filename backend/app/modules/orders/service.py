from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, KitchenAccessDeniedError, NotFoundError
from app.modules.chefs.models import Chef
from app.modules.kitchens.models import Kitchen
from app.modules.orders.models import Order, OrderLine
from app.modules.orders.repository import OrderLineRepository, OrderRepository
from app.modules.orders.schemas import (
    OrderCreateRequest,
    OrderSubmitResponse,
    OrderWithLinesResponse,
)
from app.shared.enums import OrderStatus


class OrderService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = OrderRepository(db)
        self._line_repo = OrderLineRepository(db)

    async def list_orders(
        self,
        kitchen: Kitchen,
        status: OrderStatus | None = None,
    ) -> list[Order]:
        return await self._repo.list_for_kitchen(kitchen.id, status)

    async def create_order(
        self, kitchen: Kitchen, chef: Chef, data: OrderCreateRequest
    ) -> OrderWithLinesResponse:
        order = Order(
            kitchen_id=kitchen.id,
            chef_id=chef.id,
            delivery_date=data.delivery_date,
            notes=data.notes,
            status=OrderStatus.DRAFT,
        )
        order = await self._repo.create(order)

        lines = [
            OrderLine(
                order_id=order.id,
                catalog_product_id=line.catalog_product_id,
                product_name=line.product_name,
                unit=line.unit,
                quantity_ordered=line.quantity_ordered,
                unit_price=line.unit_price,
                ingredient_id=line.ingredient_id,
            )
            for line in data.lines
        ]
        lines = await self._line_repo.create_many(lines)

        return OrderWithLinesResponse(
            id=order.id,
            kitchen_id=order.kitchen_id,
            chef_id=order.chef_id,
            external_order_id=order.external_order_id,
            status=OrderStatus(order.status),
            delivery_date=order.delivery_date,
            notes=order.notes,
            created_at=order.created_at,
            updated_at=order.updated_at,
            lines=[
                _line_to_schema(l) for l in lines
            ],
        )

    async def submit_order(
        self, kitchen: Kitchen, order_id: uuid.UUID
    ) -> OrderSubmitResponse:
        order = await self._require_owned(kitchen, order_id)
        if order.status != OrderStatus.DRAFT:
            raise ConflictError(f"Order cannot be submitted from status '{order.status}'.")

        order.status = OrderStatus.SUBMITTED
        order = await self._repo.update(order)

        return OrderSubmitResponse(
            order_id=order.id,
            external_order_id=order.external_order_id,
            status=OrderStatus(order.status),
            message="Order submitted to Food Bundles.",
        )

    async def confirm_order(
        self, kitchen: Kitchen, order_id: uuid.UUID
    ) -> OrderSubmitResponse:
        order = await self._require_owned(kitchen, order_id)
        if order.status not in (OrderStatus.SUBMITTED, OrderStatus.CONFIRMED):
            raise ConflictError(f"Order cannot be confirmed from status '{order.status}'.")
        order.status = OrderStatus.CONFIRMED
        order = await self._repo.update(order)
        return OrderSubmitResponse(
            order_id=order.id,
            external_order_id=order.external_order_id,
            status=OrderStatus(order.status),
            message="Order confirmed.",
        )

    async def cancel_order(
        self, kitchen: Kitchen, order_id: uuid.UUID
    ) -> OrderSubmitResponse:
        order = await self._require_owned(kitchen, order_id)
        if order.status not in (OrderStatus.DRAFT, OrderStatus.SUBMITTED):
            raise ConflictError(
                f"Order cannot be cancelled from status '{order.status}'. "
                "Only draft or submitted orders may be cancelled."
            )
        order.status = OrderStatus.CANCELLED
        order = await self._repo.update(order)
        return OrderSubmitResponse(
            order_id=order.id,
            external_order_id=order.external_order_id,
            status=OrderStatus(order.status),
            message="Order cancelled.",
        )

    async def get_order(
        self, kitchen: Kitchen, order_id: uuid.UUID
    ) -> OrderWithLinesResponse:
        order = await self._repo.get_with_lines(order_id)
        if order is None:
            raise NotFoundError("Order not found.")
        if order.kitchen_id != kitchen.id:
            raise KitchenAccessDeniedError()
        return OrderWithLinesResponse(
            id=order.id,
            kitchen_id=order.kitchen_id,
            chef_id=order.chef_id,
            external_order_id=order.external_order_id,
            status=OrderStatus(order.status),
            delivery_date=order.delivery_date,
            notes=order.notes,
            created_at=order.created_at,
            updated_at=order.updated_at,
            lines=[_line_to_schema(l) for l in order.lines],
        )

    async def _require_owned(self, kitchen: Kitchen, order_id: uuid.UUID) -> Order:
        order = await self._repo.get_by_id_and_kitchen(order_id, kitchen.id)
        if order is None:
            exists = await self._repo.get_by_id(order_id)
            if exists is None:
                raise NotFoundError("Order not found.")
            raise KitchenAccessDeniedError()
        return order


def _line_to_schema(line: OrderLine):
    from app.modules.orders.schemas import OrderLineResponse
    return OrderLineResponse(
        id=line.id,
        order_id=line.order_id,
        catalog_product_id=line.catalog_product_id,
        product_name=line.product_name,
        unit=line.unit,
        quantity_ordered=line.quantity_ordered,
        unit_price=line.unit_price,
        ingredient_id=line.ingredient_id,
    )
