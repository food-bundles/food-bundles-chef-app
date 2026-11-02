from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import KitchenAccessDeniedError, NotFoundError
from app.modules.chefs.models import Chef
from app.modules.kitchens.models import Kitchen
from app.modules.kitchens.repository import KitchenRepository
from app.modules.kitchens.schemas import KitchenCreateRequest, KitchenUpdateRequest
from app.shared.enums import KitchenStatus


class KitchenService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = KitchenRepository(db)

    async def list_kitchens(self, chef: Chef) -> list[Kitchen]:
        return await self._repo.list_for_chef(chef.id)

    async def create_kitchen(
        self, chef: Chef, data: KitchenCreateRequest
    ) -> Kitchen:
        kitchen = Kitchen(
            chef_id=chef.id,
            name=data.name,
            location=data.location,
            address=data.address,
            phone=data.phone,
            currency=data.currency,
            timezone=data.timezone,
        )
        return await self._repo.create(kitchen)

    async def get_kitchen(self, chef: Chef, kitchen_id: uuid.UUID) -> Kitchen:
        return await self._require_owned(chef, kitchen_id)

    async def update_kitchen(
        self, chef: Chef, kitchen_id: uuid.UUID, data: KitchenUpdateRequest
    ) -> Kitchen:
        kitchen = await self._require_owned(chef, kitchen_id)

        if data.name is not None:
            kitchen.name = data.name
        if data.location is not None:
            kitchen.location = data.location
        if data.address is not None:
            kitchen.address = data.address
        if data.phone is not None:
            kitchen.phone = data.phone
        if data.currency is not None:
            kitchen.currency = data.currency
        if data.timezone is not None:
            kitchen.timezone = data.timezone

        return await self._repo.update(kitchen)

    async def archive_kitchen(self, chef: Chef, kitchen_id: uuid.UUID) -> Kitchen:
        kitchen = await self._require_owned(chef, kitchen_id)
        kitchen.status = KitchenStatus.ARCHIVED
        kitchen.archived_at = datetime.now(UTC)
        return await self._repo.update(kitchen)

    async def _require_owned(self, chef: Chef, kitchen_id: uuid.UUID) -> Kitchen:
        kitchen = await self._repo.get_by_id_and_chef(kitchen_id, chef.id)
        if kitchen is None:
            # Check if it exists at all to return the right error
            exists = await self._repo.get_by_id(kitchen_id)
            if exists is None:
                raise NotFoundError("Kitchen not found.")
            raise KitchenAccessDeniedError()
        return kitchen
