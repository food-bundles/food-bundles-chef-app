from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.models import CatalogProduct


class CatalogRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_active(self, category: str | None = None) -> list[CatalogProduct]:
        q = select(CatalogProduct).where(CatalogProduct.is_active == True)
        if category:
            q = q.where(CatalogProduct.category == category)
        q = q.order_by(CatalogProduct.category, CatalogProduct.name)
        result = await self._db.execute(q)
        return list(result.scalars().all())

    async def get_by_sku(self, sku: str) -> CatalogProduct | None:
        result = await self._db.execute(
            select(CatalogProduct).where(CatalogProduct.sku == sku)
        )
        return result.scalar_one_or_none()

    async def upsert_by_sku(self, product: CatalogProduct) -> CatalogProduct:
        existing = await self.get_by_sku(product.sku)
        if existing:
            existing.name = product.name
            existing.category = product.category
            existing.unit = product.unit
            existing.reference_price = product.reference_price
            existing.description = product.description
            existing.is_active = product.is_active
            await self._db.flush()
            return existing
        self._db.add(product)
        await self._db.flush()
        return product
