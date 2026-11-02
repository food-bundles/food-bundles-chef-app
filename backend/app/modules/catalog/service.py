from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.repository import CatalogRepository
from app.modules.catalog.schemas import CatalogProductResponse


class CatalogService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = CatalogRepository(db)

    async def list_products(
        self, category: str | None = None
    ) -> list[CatalogProductResponse]:
        products = await self._repo.list_active(category)
        return [CatalogProductResponse.model_validate(p) for p in products]

    async def get_by_sku(self, sku: str) -> CatalogProductResponse | None:
        product = await self._repo.get_by_sku(sku)
        if product is None:
            return None
        return CatalogProductResponse.model_validate(product)
