"""Arq cron task: refresh catalog products from Food Bundles API into local DB."""
from __future__ import annotations

import ssl

import certifi
import httpx
import structlog

from app.core.config import settings
from app.core.database import AsyncSessionFactory
from app.modules.catalog.models import CatalogProduct
from app.modules.catalog.repository import CatalogRepository

logger = structlog.get_logger(__name__)

_ssl_context = ssl.create_default_context(cafile=certifi.where())


async def refresh_catalog(ctx: dict) -> None:  # type: ignore[type-arg]
    """Hourly cron: pull products from Food Bundles API and upsert locally."""
    if settings.FOOD_BUNDLES_CATALOG_PROVIDER != "live":
        logger.debug("catalog_refresh_skip_mock")
        return
    if not settings.FOOD_BUNDLES_API_URL or not settings.FOOD_BUNDLES_API_KEY:
        logger.warning("catalog_refresh_no_config")
        return

    url = f"{settings.FOOD_BUNDLES_API_URL.rstrip('/')}/api/v1/products"
    headers = {"Authorization": f"Bearer {settings.FOOD_BUNDLES_API_KEY}"}

    try:
        async with httpx.AsyncClient(timeout=20.0, verify=_ssl_context) as client:
            resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        products = resp.json()
    except Exception:
        logger.exception("catalog_refresh_fetch_failed")
        return

    upserted = 0
    async with AsyncSessionFactory() as db:
        repo = CatalogRepository(db)
        for item in products:
            try:
                product = CatalogProduct(
                    sku=item["sku"],
                    name=item["name"],
                    category=item.get("category"),
                    unit=item.get("unit", "unit"),
                    reference_price=item.get("price"),
                    description=item.get("description"),
                    is_active=item.get("is_active", True),
                )
                await repo.upsert_by_sku(product)
                upserted += 1
            except Exception:
                logger.exception("catalog_upsert_failed", sku=item.get("sku"))

    logger.info("catalog_refreshed", upserted=upserted, total=len(products))
