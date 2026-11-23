"""Delivery receiving service.

When a chef receives a Food Bundles delivery, they record what actually arrived
vs what was ordered. Accepted quantities are posted to inventory immediately.
The SHORT_DELIVERY_THRESHOLD triggers a flag if accepted < 95% of ordered.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import SHORT_DELIVERY_THRESHOLD
from app.core.exceptions import ConflictError, NotFoundError
from app.domain.calculations import convert_quantity
from app.modules.ingredients.repository import IngredientRepository
from app.modules.inventory.models import InventoryEntry
from app.modules.inventory.repository import InventoryRepository
from app.modules.kitchens.models import Kitchen
from app.modules.orders.models import OrderLine
from app.modules.orders.repository import OrderLineRepository, OrderRepository
from app.modules.orders.schemas import OrderSubmitResponse
from app.modules.receiving.models import DeliveryReceiving
from app.modules.receiving.schemas import BulkReceivingRequest, ReceivingResponse
from app.shared.enums import OrderStatus, ReceivingDecision

logger = structlog.get_logger(__name__)


class ReceivingService:
    def __init__(self, db: AsyncSession) -> None:
        self._order_repo = OrderRepository(db)
        self._line_repo = OrderLineRepository(db)
        self._inv_repo = InventoryRepository(db)
        self._ingredient_repo = IngredientRepository(db)
        self._db = db

    async def _add_delivery_to_stock(
        self,
        kitchen_id: uuid.UUID,
        chef_id: uuid.UUID,
        order_id: uuid.UUID,
        order_line: OrderLine,
        accepted_qty: Decimal,
    ) -> None:
        """Add the accepted quantity to the ingredient's current stock.

        Walk-in lines without an ingredient mapping are matched by name. Lines whose
        unit cannot be converted to the ingredient's unit are skipped, never guessed.
        """
        ingredient = None
        if order_line.ingredient_id is not None:
            ingredient = await self._ingredient_repo.get_by_id_and_kitchen(
                order_line.ingredient_id, kitchen_id
            )
        if ingredient is None:
            ingredient = await self._ingredient_repo.find_by_name(
                kitchen_id, order_line.product_name
            )
        if ingredient is None:
            return

        qty = convert_quantity(accepted_qty, order_line.unit, ingredient.unit)
        if qty is None:
            logger.warning(
                "delivery_unit_mismatch",
                kitchen_id=str(kitchen_id),
                ingredient_id=str(ingredient.id),
            )
            return

        current = await self._inv_repo.current_stock(kitchen_id, ingredient.id)
        self._db.add(
            InventoryEntry(
                kitchen_id=kitchen_id,
                ingredient_id=ingredient.id,
                quantity=current + qty,
                entry_type="delivery",
                notes=f"Delivery from order {order_id}: +{qty} {ingredient.unit}",
                recorded_by=chef_id,
            )
        )
        # Flush so a second line for the same ingredient reads this new level.
        await self._db.flush()

    async def start_delivery(
        self,
        kitchen: Kitchen,
        order_id: uuid.UUID,
    ) -> OrderSubmitResponse:
        """Transition a confirmed order to OUT_FOR_DELIVERY (chef started receiving)."""
        order = await self._order_repo.get_by_id_and_kitchen(order_id, kitchen.id)
        if order is None:
            raise NotFoundError("Order not found in this kitchen.")
        if order.status not in (OrderStatus.SUBMITTED, OrderStatus.CONFIRMED):
            raise ConflictError(
                f"Cannot start delivery for order in status '{order.status}'. "
                "Order must be SUBMITTED or CONFIRMED."
            )
        order.status = OrderStatus.OUT_FOR_DELIVERY
        await self._db.flush()
        return OrderSubmitResponse(
            order_id=order.id,
            external_order_id=order.external_order_id,
            status=OrderStatus(order.status),
            message="Delivery started.",
        )

    async def receive_delivery(
        self,
        kitchen: Kitchen,
        order_id: uuid.UUID,
        chef_id: uuid.UUID,
        data: BulkReceivingRequest,
    ) -> list[ReceivingResponse]:

        order = await self._order_repo.get_with_lines(order_id)
        if order is None or order.kitchen_id != kitchen.id:
            raise NotFoundError("Order not found in this kitchen.")
        # Phase 9: an order can be received as soon as it is sent (the chef weighs what
        # arrived; Food Bundles has no confirmation feed yet).
        if order.status not in (
            OrderStatus.SUBMITTED,
            OrderStatus.CONFIRMED,
            OrderStatus.OUT_FOR_DELIVERY,
        ):
            raise ConflictError(
                f"Cannot receive delivery for order in status '{order.status}'. "
                "Order must be SUBMITTED, CONFIRMED or OUT_FOR_DELIVERY."
            )

        line_map: dict[uuid.UUID, OrderLine] = {line.id: line for line in order.lines}
        responses: list[ReceivingResponse] = []

        for req_line in data.lines:
            order_line = line_map.get(req_line.order_line_id)
            if order_line is None:
                raise NotFoundError(
                    f"Order line {req_line.order_line_id} not found in this order."
                )

            accepted_qty = _accepted_quantity(
                req_line.quantity_received, req_line.decision
            )
            short = _is_short_delivery(accepted_qty, order_line.quantity_ordered)

            receiving = DeliveryReceiving(
                order_line_id=order_line.id,
                kitchen_id=kitchen.id,
                quantity_received=req_line.quantity_received,
                decision=req_line.decision,
                rejection_reason=req_line.rejection_reason,
                short_delivery=short,
                quality=req_line.quality,
                issue_reasons=",".join(req_line.issue_reasons) or None,
                received_by=chef_id,
            )
            self._db.add(receiving)
            await self._db.flush()
            await self._db.refresh(receiving)

            if accepted_qty > Decimal("0"):
                await self._add_delivery_to_stock(
                    kitchen.id, chef_id, order_id, order_line, accepted_qty
                )

            responses.append(ReceivingResponse.model_validate(receiving))

        # Mark order delivered
        order.status = OrderStatus.DELIVERED
        await self._db.flush()

        return responses


def _accepted_quantity(qty: Decimal, decision: ReceivingDecision) -> Decimal:
    if decision == ReceivingDecision.REJECTED:
        return Decimal("0")
    return qty  # ACCEPTED or PARTIALLY_ACCEPTED — use what was received


def _is_short_delivery(accepted: Decimal, ordered: Decimal) -> bool:
    """True when accepted is more than SHORT_DELIVERY_THRESHOLD below ordered."""
    if ordered <= Decimal("0"):
        return False
    shortfall_fraction = (ordered - accepted) / ordered
    return shortfall_fraction > Decimal(str(SHORT_DELIVERY_THRESHOLD))
