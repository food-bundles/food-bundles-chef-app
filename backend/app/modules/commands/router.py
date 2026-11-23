from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.commands.schemas import (
    AcceptRequest,
    CommandCreateRequest,
    CommandResponse,
    CommandsTodayResponse,
    DeclineRequest,
    StaffCreateRequest,
    StaffResponse,
    StaffUpdateRequest,
)
from app.modules.commands.service import CommandService
from app.modules.kitchens.models import Kitchen
from app.modules.kitchens.service import KitchenService

router = APIRouter(prefix="/kitchens/{kitchen_id}", tags=["commands"])


async def _get_kitchen(
    kitchen_id: uuid.UUID,
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> Kitchen:
    return await KitchenService(db).get_kitchen(current_chef, kitchen_id)


# ── staff ("Recorded by") ─────────────────────────────────────────────────────


@router.get("/staff", response_model=list[StaffResponse])
async def list_staff(
    kitchen: Kitchen = Depends(_get_kitchen), db: AsyncSession = Depends(get_db)
) -> list[StaffResponse]:
    return [StaffResponse.model_validate(s) for s in await CommandService(db).list_staff(kitchen)]


@router.post("/staff", response_model=StaffResponse, status_code=201)
async def create_staff(
    body: StaffCreateRequest,
    kitchen: Kitchen = Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> StaffResponse:
    return StaffResponse.model_validate(await CommandService(db).create_staff(kitchen, body))


@router.patch("/staff/{staff_id}", response_model=StaffResponse)
async def update_staff(
    staff_id: uuid.UUID,
    body: StaffUpdateRequest,
    kitchen: Kitchen = Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> StaffResponse:
    return StaffResponse.model_validate(
        await CommandService(db).update_staff(kitchen, staff_id, body)
    )


# ── commands ──────────────────────────────────────────────────────────────────


@router.get("/commands/today", response_model=CommandsTodayResponse)
async def commands_today(
    kitchen: Kitchen = Depends(_get_kitchen), db: AsyncSession = Depends(get_db)
) -> CommandsTodayResponse:
    """Today's commands, counters, and per dish: ordered today and can make."""
    return await CommandService(db).today(kitchen)


@router.post("/commands", response_model=CommandResponse, status_code=201)
async def create_command(
    body: CommandCreateRequest,
    kitchen: Kitchen = Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> CommandResponse:
    """Chef-recorded commands go straight to Cooking (stock deducted); waiter- and
    cashier-recorded ones wait as New (COMMAND_NEW_STATUS_ROLES). Idempotent on `id`."""
    return await CommandService(db).create(kitchen, current_chef, body)


@router.get("/commands/{command_id}", response_model=CommandResponse)
async def get_command(
    command_id: uuid.UUID,
    kitchen: Kitchen = Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> CommandResponse:
    return await CommandService(db).get(kitchen, command_id)


@router.post("/commands/{command_id}/accept", response_model=CommandResponse)
async def accept_command(
    command_id: uuid.UUID,
    body: AcceptRequest,
    kitchen: Kitchen = Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> CommandResponse:
    return await CommandService(db).accept(kitchen, current_chef, command_id, body)


@router.post("/commands/{command_id}/decline", response_model=CommandResponse)
async def decline_command(
    command_id: uuid.UUID,
    body: DeclineRequest,
    kitchen: Kitchen = Depends(_get_kitchen),
    db: AsyncSession = Depends(get_db),
) -> CommandResponse:
    return await CommandService(db).decline(kitchen, command_id, body)


@router.post("/commands/{command_id}/serve", response_model=CommandResponse)
async def serve_command(
    command_id: uuid.UUID,
    kitchen: Kitchen = Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> CommandResponse:
    """Cooking → Served (Dine-in) or Handed (To go)."""
    return await CommandService(db).serve(kitchen, current_chef, command_id)


@router.post("/commands/{command_id}/cancel", response_model=CommandResponse)
async def cancel_command(
    command_id: uuid.UUID,
    kitchen: Kitchen = Depends(_get_kitchen),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> CommandResponse:
    """Cooking → Cancelled; the recipe goes back into stock."""
    return await CommandService(db).cancel(kitchen, current_chef, command_id)
