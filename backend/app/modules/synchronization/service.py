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

from app.core.exceptions import AppError, ValidationError
from app.modules.commands.schemas import AcceptRequest, CommandCreateRequest, DeclineRequest
from app.modules.commands.service import CommandService
from app.modules.synchronization.models import SyncOperation
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
        # Phase 9: an operation applied in an earlier sync (the app retried after a lost
        # response) is skipped, never applied twice.
        done = await self._db.get(SyncOperation, mutation.operation_id)
        if done is not None:
            return MutationResult(
                operation_id=mutation.operation_id,
                status="skipped",
                error_message="Already applied.",
                server_id=done.server_id,
            )
        try:
            async with self._db.begin_nested():
                server_id = await self._apply(kitchen, chef, mutation)
                self._db.add(
                    SyncOperation(
                        operation_id=mutation.operation_id,
                        kitchen_id=kitchen.id,
                        operation_type=mutation.operation_type,
                        server_id=str(server_id) if server_id else None,
                    )
                )
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
        except Exception:
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
            sales_svc = SalesService(self._db)
            record = await sales_svc.record_sale(
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
            ingredient_svc = IngredientService(self._db)
            ingredient = await ingredient_svc.update_ingredient(
                kitchen,
                uuid.UUID(mutation.resource_id),
                IngredientUpdateRequest(**_strip_none(p)),
            )
            return ingredient.id

        if op == "record_inventory":
            inventory_svc = InventoryService(self._db)
            entry = await inventory_svc.record_stock(
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
            order_svc = OrderService(self._db)
            order = await order_svc.create_order(
                kitchen,
                chef,
                OrderCreateRequest(
                    delivery_date=p.get("delivery_date"),
                    notes=p.get("notes"),
                    lines=[OrderLineCreate(**line) for line in p["lines"]],
                ),
            )
            return order.id

        if op == "submit_order":
            order_svc = OrderService(self._db)
            resp = await order_svc.submit_order(kitchen, uuid.UUID(mutation.resource_id))
            return resp.order_id

        if op == "cancel_order":
            order_svc = OrderService(self._db)
            resp = await order_svc.cancel_order(kitchen, uuid.UUID(mutation.resource_id))
            return resp.order_id

        if op == "start_delivery":
            receiving_svc = ReceivingService(self._db)
            resp = await receiving_svc.start_delivery(kitchen, uuid.UUID(mutation.resource_id))
            return resp.order_id

        if op == "receive_delivery":
            receiving_svc = ReceivingService(self._db)
            await receiving_svc.receive_delivery(
                kitchen,
                uuid.UUID(mutation.resource_id),
                chef.id,
                BulkReceivingRequest(
                    lines=[
                        ReceivingLineRequest(
                            order_line_id=uuid.UUID(line["order_line_id"]),
                            quantity_received=Decimal(str(line["quantity_received"])),
                            decision=ReceivingDecision(line.get("decision", "accepted")),
                            rejection_reason=line.get("rejection_reason"),
                            quality=line.get("quality"),
                            issue_reasons=line.get("issue_reasons") or [],
                        )
                        for line in p["lines"]
                    ]
                ),
            )
            return None

        if op == "create_command":
            command = await CommandService(self._db).create(
                kitchen, chef, CommandCreateRequest(**p)
            )
            return command.id

        if op == "command_action":
            svc = CommandService(self._db)
            command_id = uuid.UUID(mutation.resource_id)
            action = p.get("action")
            if action == "accept":
                await svc.accept(kitchen, chef, command_id, AcceptRequest(portions=p.get("portions")))
            elif action == "decline":
                await svc.decline(
                    kitchen,
                    command_id,
                    DeclineRequest(add_to_requisition=p.get("add_to_requisition", True)),
                )
            elif action == "serve":
                await svc.serve(kitchen, chef, command_id)
            elif action == "cancel":
                await svc.cancel(kitchen, chef, command_id)
            else:
                raise ValidationError(f"Unknown command action: {action}")
            return command_id

        if op == "count_stock":
            from app.modules.inventory.stock_day import StockDayService

            await StockDayService(self._db).count(
                kitchen,
                chef.id,
                uuid.UUID(p["ingredient_id"]),
                Decimal(str(p["counted"])),
                p.get("reason", "error"),
            )
            return None

        if op == "create_menu_item":
            menu_svc = MenuService(self._db)
            item = await menu_svc.create_item(
                kitchen,
                uuid.UUID(p["menu_id"]),
                MenuItemCreateRequest(
                    name=p["name"],
                    description=p.get("description"),
                    selling_price=Decimal(str(p["selling_price"])),
                    selling_price_currency=p.get("selling_price_currency"),
                ),
            )
            return item.id

        if op == "update_menu_item":
            menu_svc = MenuService(self._db)
            item = await menu_svc.update_item(
                kitchen,
                uuid.UUID(p["menu_id"]),
                uuid.UUID(mutation.resource_id),
                MenuItemUpdateRequest(**_strip_none(p)),
            )
            return item.id

        if op == "add_recipe_line":
            recipe_svc = RecipeService(self._db)
            line = await recipe_svc.add_line(
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
            recipe_svc = RecipeService(self._db)
            line = await recipe_svc.update_line(
                kitchen,
                uuid.UUID(p["menu_item_id"]),
                uuid.UUID(mutation.resource_id),
                RecipeLineUpdateRequest(**_strip_none(p)),
            )
            return line.id

        if op == "delete_recipe_line":
            recipe_svc = RecipeService(self._db)
            await recipe_svc.delete_line(
                kitchen,
                uuid.UUID(p["menu_item_id"]),
                uuid.UUID(mutation.resource_id),
            )
            return None

        raise ValueError(f"Unknown operation type: {op}")


def _strip_none(d: dict[str, Any]) -> dict[str, Any]:
    """Remove None values so Pydantic partial-update schemas get clean dicts."""
    return {k: v for k, v in d.items() if v is not None}
