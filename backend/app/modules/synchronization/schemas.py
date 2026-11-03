"""Mobile offline sync contract.

The mobile app queues mutations while offline and replays them when connectivity
returns. The server processes each mutation idempotently using operation_id as
the deduplication key. See INTEGRATION_DESIGN.md § Offline Sync Contract.

Supported operation types (from mobile MutationQueue):
  record_sale           — DailySaleRecord upsert
  update_ingredient     — Ingredient field update
  record_inventory      — InventoryEntry creation
  create_order          — Order + OrderLines creation
  submit_order          — Order status → SUBMITTED
  receive_delivery      — BulkReceivingRequest
  create_menu_item      — MenuItem creation
  update_menu_item      — MenuItem field update
  add_recipe_line       — RecipeLine creation
  update_recipe_line    — RecipeLine field update
  delete_recipe_line    — RecipeLine deletion
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.shared.enums import MutationStatus

OperationType = Literal[
    "record_sale",
    "update_ingredient",
    "record_inventory",
    "create_order",
    "submit_order",
    "cancel_order",
    "receive_delivery",
    "start_delivery",
    "create_menu_item",
    "update_menu_item",
    "add_recipe_line",
    "update_recipe_line",
    "delete_recipe_line",
]


class QueuedMutation(BaseModel):
    """A single offline mutation from the mobile queue."""

    operation_id: str = Field(..., description="Client-generated UUID, deduplication key")
    operation_type: OperationType
    # resource_id: the primary resource this mutation targets (kitchen_id, order_id, etc.)
    resource_id: str
    payload: dict[str, Any]
    queued_at: datetime
    # client_status: the status the mobile app recorded when it queued this
    client_status: MutationStatus = MutationStatus.PENDING


class SyncRequest(BaseModel):
    kitchen_id: uuid.UUID
    mutations: list[QueuedMutation] = Field(..., min_length=1, max_length=100)


class MutationResult(BaseModel):
    operation_id: str
    status: Literal["applied", "skipped", "failed", "conflict"]
    error_code: str | None = None
    error_message: str | None = None
    # server_id: the created/updated resource id if status == "applied"
    server_id: str | None = None


class SyncResponse(BaseModel):
    kitchen_id: uuid.UUID
    processed: int
    results: list[MutationResult]
