from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    CatalogNotAvailableError,
    ConflictError,
    KitchenAccessDeniedError,
    NotFoundError,
    OrderOnItsWayError,
)
from app.modules.chefs.models import Chef
from app.modules.kitchens.models import Kitchen
from app.modules.orders.models import Order, OrderLine
from app.modules.orders.repository import OrderLineRepository, OrderRepository
from app.modules.orders.schemas import (
    OrderCreateRequest,
    OrderLineResponse,
    OrderSubmitResponse,
    OrderWithLinesResponse,
)
from app.shared.enums import OrderStatus
from app.shared.money_fields import resolve_currency, set_price

# Order lines typed in by the chef rather than picked from the Food Bundles catalogue.
MANUAL_PRODUCT_ID = "manual"


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
        # Food Bundles catalogue items only where Food Bundles operates (decision 9);
        # everywhere else, lines are manual items ("manual").
        if not kitchen.catalog_available and any(
            line.catalog_product_id != MANUAL_PRODUCT_ID for line in data.lines
        ):
            raise CatalogNotAvailableError()
        order = Order(
            kitchen_id=kitchen.id,
            chef_id=chef.id,
            delivery_date=data.delivery_date,
            notes=data.notes,
            route=data.route,
            status=OrderStatus.CONFIRMED,
        )
        order = await self._repo.create(order)

        lines = []
        for line in data.lines:
            row = OrderLine(
                order_id=order.id,
                catalog_product_id=line.catalog_product_id,
                product_name=line.product_name,
                unit=line.unit,
                quantity_ordered=line.quantity_ordered,
                ingredient_id=line.ingredient_id,
            )
            set_price(
                row,
                "unit_price",
                line.unit_price,
                resolve_currency(kitchen, line.unit_price_currency),
            )
            lines.append(row)
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
            lines=[_line_to_schema(line) for line in lines],
        )

    async def submit_order(self, kitchen: Kitchen, order_id: uuid.UUID) -> OrderSubmitResponse:
        order = await self._require_owned(kitchen, order_id)
        if order.status not in (OrderStatus.DRAFT, OrderStatus.SUBMITTED):
            raise ConflictError(f"Order cannot be submitted from status '{order.status}'.")

        # Skip the intermediate SUBMITTED state — go straight to CONFIRMED so
        # the chef can start receiving immediately without a separate confirm step.
        order.status = OrderStatus.CONFIRMED
        order = await self._repo.update(order)

        return OrderSubmitResponse(
            order_id=order.id,
            external_order_id=order.external_order_id,
            status=OrderStatus(order.status),
            message="Order confirmed and ready for delivery.",
        )

    async def confirm_order(self, kitchen: Kitchen, order_id: uuid.UUID) -> OrderSubmitResponse:
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

    async def cancel_order(self, kitchen: Kitchen, order_id: uuid.UUID) -> OrderSubmitResponse:
        """Cancel an order that is not yet on its way.

        Orders are created CONFIRMED, so confirmed orders must stay cancellable. Once the
        order is OUT_FOR_DELIVERY the chef must contact Food Bundles support instead.

        NOTE: today OUT_FOR_DELIVERY means "the chef started receiving" (set by
        POST .../receiving/start), NOT a real dispatch by Food Bundles: there is no
        dispatched_at / paid_at yet. Cancelling here also does not notify Food Bundles
        about an order already sent by order_sync. Both are open items until the Food
        Bundles status API exists (backend/README.md, section 4.5).
        """
        order = await self._require_owned(kitchen, order_id)
        if order.status == OrderStatus.OUT_FOR_DELIVERY:
            raise OrderOnItsWayError()
        if order.status not in (OrderStatus.DRAFT, OrderStatus.SUBMITTED, OrderStatus.CONFIRMED):
            raise ConflictError(
                f"Order cannot be cancelled from status '{order.status}'. "
                "Only orders that are not yet on their way may be cancelled."
            )
        order.status = OrderStatus.CANCELLED
        order = await self._repo.update(order)
        return OrderSubmitResponse(
            order_id=order.id,
            external_order_id=order.external_order_id,
            status=OrderStatus(order.status),
            message="Order cancelled.",
        )

    async def get_order(self, kitchen: Kitchen, order_id: uuid.UUID) -> OrderWithLinesResponse:
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
            lines=[_line_to_schema(line) for line in order.lines],
        )

    async def _require_owned(self, kitchen: Kitchen, order_id: uuid.UUID) -> Order:
        order = await self._repo.get_by_id_and_kitchen(order_id, kitchen.id)
        if order is None:
            exists = await self._repo.get_by_id(order_id)
            if exists is None:
                raise NotFoundError("Order not found.")
            raise KitchenAccessDeniedError()
        return order


def _line_to_schema(line: OrderLine) -> OrderLineResponse:
    return OrderLineResponse(
        id=line.id,
        order_id=line.order_id,
        catalog_product_id=line.catalog_product_id,
        product_name=line.product_name,
        unit=line.unit,
        quantity_ordered=line.quantity_ordered,
        unit_price=line.unit_price,
        unit_price_currency=line.unit_price_currency,
        unit_price_money=line.unit_price_money,
        ingredient_id=line.ingredient_id,
    )
