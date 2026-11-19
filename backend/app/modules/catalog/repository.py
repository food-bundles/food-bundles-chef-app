from __future__ import annotations

from decimal import Decimal

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.catalog.models import CatalogProduct
from app.shared.money import InexactAmountError, Money

logger = structlog.get_logger(__name__)


class CatalogRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_active(self, category: str | None = None) -> list[CatalogProduct]:
        q = select(CatalogProduct).where(CatalogProduct.is_active.is_(True))
        if category:
            q = q.where(CatalogProduct.category == category)
        q = q.order_by(CatalogProduct.category, CatalogProduct.name)
        result = await self._db.execute(q)
        return list(result.scalars().all())

    async def get_by_sku(self, sku: str) -> CatalogProduct | None:
        result = await self._db.execute(select(CatalogProduct).where(CatalogProduct.sku == sku))
        return result.scalar_one_or_none()

    async def upsert_by_sku(self, product: CatalogProduct) -> CatalogProduct:
        _set_reference_price(product, product.reference_price)
        existing = await self.get_by_sku(product.sku)
        if existing:
            existing.name = product.name
            existing.category = product.category
            existing.unit = product.unit
            _set_reference_price(existing, product.reference_price)
            existing.description = product.description
            existing.is_active = product.is_active
            await self._db.flush()
            return existing
        self._db.add(product)
        await self._db.flush()
        return product


def _set_reference_price(product: CatalogProduct, price: Decimal | None) -> None:
    """Catalogue prices are in Food Bundles' currency (FOOD_BUNDLES_CATALOG_CURRENCY).
    A feed price with more decimals than that currency allows keeps its decimal value but no
    minor units (logged), rather than being rounded."""
    product.reference_price = price
    if price is None:
        product.reference_price_minor = None
        product.reference_price_currency = None
        return
    currency = settings.FOOD_BUNDLES_CATALOG_CURRENCY
    try:
        money = Money.of(price, currency)
    except InexactAmountError:
        logger.warning("catalog_price_inexact", sku=product.sku, currency=currency)
        product.reference_price_minor = None
        product.reference_price_currency = currency
        return
    product.reference_price_minor = money.amount_minor
    product.reference_price_currency = currency
