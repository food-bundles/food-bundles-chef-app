"""Offline sync service.

Processes a batch of QueuedMutation envelopes from mobile. Each mutation is:
1. Checked for idempotency — already-applied operation_ids return "skipped"
2. Dispatched to the appropriate domain service
3. Errors are caught per-mutation; one failure does NOT abort the batch

Idempotency is tracked in-memory per request (operation_id dedup set).
Persistent dedup via a DB table is a later hardening step (see INTEGRATION_DESIGN.md backlog).
"""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.modules.chefs.models import Chef
from app.modules.ingredients.schemas import IngredientUpdateRequest
from app.modules.ingredients.service import IngredientService
from app.modules.inventory.schemas import InventoryEntryCreateRequest
from app.modules.inventory.service import InventoryService
from app.modules.kitchens.models import Kitchen
from app.modules.menus.schemas import MenuItemCreateRequest, MenuItemUpdateRequest
from app.modules.menus.service import MenuService
from app.modules.orders.schemas import OrderCreateRequest, OrderLineCreate
from app.modules.orders.service import OrderService
from app.modules.receiving.schemas import BulkReceivingRequest, ReceivingLineRequest
from app.modules.receiving.service import ReceivingService
from app.modules.recipes.schemas import (
    RecipeLineCreateRequest,
    RecipeLineUpdateRequest,
)
from app.modules.recipes.service import RecipeService
from app.modules.sales.schemas import DailySaleRecordRequest
from app.modules.sales.service import SalesService
from app.modules.synchronization.schemas import (
    MutationResult,
    QueuedMutation,
    SyncResponse,
)
from app.shared.enums import ReceivingDecision

logger = structlog.get_logger(__name__)


class SyncService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def process_batch(
        self,
        kitchen: Kitchen,
        chef: Chef,
        mutations: list[QueuedMutation],
    ) -> SyncResponse:
        seen_ids: set[str] = set()
        results: list[MutationResult] = []

        for mutation in mutations:
            if mutation.operation_id in seen_ids:
                results.append(
                    MutationResult(
                        operation_id=mutation.operation_id,
                        status="skipped",
                        error_message="Duplicate operation_id in this batch.",
                    )
                )
                continue
            seen_ids.add(mutation.operation_id)

            result = await self._dispatch(kitchen, chef, mutation)
            results.append(result)

        return SyncResponse(
            kitchen_id=kitchen.id,
            processed=len(results),
            results=results,
        )

    async def _dispatch(
        self, kitchen: Kitchen, chef: Chef, mutation: QueuedMutation
    ) -> MutationResult:
        try:
            server_id = await self._apply(kitchen, chef, mutation)
            return MutationResult(
                operation_id=mutation.operation_id,
                status="applied",
                server_id=str(server_id) if server_id else None,
            )
        except AppError as exc:
            logger.warning(
                "sync_mutation_failed",
                operation_id=mutation.operation_id,
                operation_type=mutation.operation_type,
                error_code=exc.error_code,
                message=exc.message,
            )
            return MutationResult(
                operation_id=mutation.operation_id,
                status="failed",
                error_code=exc.error_code,
                error_message=exc.message,
            )
        except Exception as exc:
            logger.exception(
                "sync_mutation_unexpected_error",
                operation_id=mutation.operation_id,
                operation_type=mutation.operation_type,
            )
            return MutationResult(
                operation_id=mutation.operation_id,
                status="failed",
                error_code="INTERNAL_ERROR",
                error_message="An unexpected error occurred processing this mutation.",
            )

    async def _apply(
        self, kitchen: Kitchen, chef: Chef, mutation: QueuedMutation
    ) -> uuid.UUID | str | None:
        p = mutation.payload
        op = mutation.operation_type

        if op == "record_sale":
            svc = SalesService(self._db)
            record = await svc.record_sale(
                kitchen,
                chef.id,
                DailySaleRecordRequest(
                    menu_item_id=uuid.UUID(p["menu_item_id"]),
                    sale_date=p["sale_date"],
                    portions_sold=int(p["portions_sold"]),
                ),
            )
            return record.id

        if op == "update_ingredient":
            svc = IngredientService(self._db)
            ingredient = await svc.update_ingredient(
                kitchen,
                uuid.UUID(mutation.resource_id),
                IngredientUpdateRequest(**_strip_none(p)),
            )
            return ingredient.id

        if op == "record_inventory":
            svc = InventoryService(self._db)
            entry = await svc.record_stock(
                kitchen,
                chef.id,
                InventoryEntryCreateRequest(
                    ingredient_id=uuid.UUID(p["ingredient_id"]),
                    quantity=Decimal(str(p["quantity"])),
                    entry_type=p.get("entry_type", "adjustment"),
                    notes=p.get("notes"),
                ),
            )
            return entry.id

        if op == "create_order":
            svc = OrderService(self._db)
            order = await svc.create_order(
                kitchen,
                chef,
                OrderCreateRequest(
                    delivery_date=p.get("delivery_date"),
                    notes=p.get("notes"),
                    lines=[OrderLineCreate(**l) for l in p["lines"]],
                ),
            )
            return order.id

        if op == "submit_order":
            svc = OrderService(self._db)
            resp = await svc.submit_order(kitchen, uuid.UUID(mutation.resource_id))
            return resp.order_id

        if op == "receive_delivery":
            svc = ReceivingService(self._db)
            results = await svc.receive_delivery(
                kitchen,
                uuid.UUID(mutation.resource_id),
                chef.id,
                BulkReceivingRequest(
                    lines=[
                        ReceivingLineRequest(
                            order_line_id=uuid.UUID(l["order_line_id"]),
                            quantity_received=Decimal(str(l["quantity_received"])),
                            decision=ReceivingDecision(l.get("decision", "accepted")),
                            rejection_reason=l.get("rejection_reason"),
                        )
                        for l in p["lines"]
                    ]
                ),
            )
            return None

        if op == "create_menu_item":
            svc = MenuService(self._db)
            item = await svc.create_item(
                kitchen,
                uuid.UUID(p["menu_id"]),
                MenuItemCreateRequest(
                    name=p["name"],
                    description=p.get("description"),
                    selling_price=Decimal(str(p["selling_price"])),
                ),
            )
            return item.id

        if op == "update_menu_item":
            svc = MenuService(self._db)
            item = await svc.update_item(
                kitchen,
                uuid.UUID(p["menu_id"]),
                uuid.UUID(mutation.resource_id),
                MenuItemUpdateRequest(**_strip_none(p)),
            )
            return item.id

        if op == "add_recipe_line":
            svc = RecipeService(self._db)
            line = await svc.add_line(
                kitchen,
                uuid.UUID(p["menu_item_id"]),
                RecipeLineCreateRequest(
                    ingredient_id=uuid.UUID(p["ingredient_id"]),
                    qty_per_portion=Decimal(str(p["qty_per_portion"])),
                    yield_fraction_override=(
                        Decimal(str(p["yield_fraction_override"]))
                        if p.get("yield_fraction_override") is not None
                        else None
                    ),
                    unit=p["unit"],
                    notes=p.get("notes"),
                ),
            )
            return line.id

        if op == "update_recipe_line":
            svc = RecipeService(self._db)
            line = await svc.update_line(
                kitchen,
                uuid.UUID(p["menu_item_id"]),
                uuid.UUID(mutation.resource_id),
                RecipeLineUpdateRequest(**_strip_none(p)),
            )
            return line.id

        if op == "delete_recipe_line":
            svc = RecipeService(self._db)
            await svc.delete_line(
                kitchen,
                uuid.UUID(p["menu_item_id"]),
                uuid.UUID(mutation.resource_id),
            )
            return None

        raise ValueError(f"Unknown operation type: {op}")


def _strip_none(d: dict) -> dict:
    """Remove None values so Pydantic partial-update schemas get clean dicts."""
    return {k: v for k, v in d.items() if v is not None}
