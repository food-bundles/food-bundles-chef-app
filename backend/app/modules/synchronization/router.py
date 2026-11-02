from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import KitchenAccessDeniedError
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.kitchens.service import KitchenService
from app.modules.synchronization.schemas import SyncRequest, SyncResponse
from app.modules.synchronization.service import SyncService

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("", response_model=SyncResponse, status_code=200)
async def sync_mutations(
    body: SyncRequest,
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> SyncResponse:
    """Process a batch of offline mutations from mobile.

    Ownership is validated once: the requesting chef must own kitchen_id.
    Each mutation is processed independently; failures are reported per-mutation
    without aborting the rest of the batch.
    """
    kitchen_svc = KitchenService(db)
    kitchen = await kitchen_svc.get_kitchen(current_chef, body.kitchen_id)

    sync_svc = SyncService(db)
    return await sync_svc.process_batch(kitchen, current_chef, body.mutations)
