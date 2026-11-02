"""Arq task: sync a submitted order to the Food Bundles platform API."""
from __future__ import annotations

import ssl
import uuid

import certifi
import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionFactory
from app.modules.orders.repository import OrderRepository
from app.shared.enums import OrderStatus

logger = structlog.get_logger(__name__)

_ssl_context = ssl.create_default_context(cafile=certifi.where())


async def sync_order_to_food_bundles(
    ctx: dict,  # type: ignore[type-arg]
    *,
    order_id: str,
    kitchen_id: str,
) -> None:
    """POST submitted order to Food Bundles API and update external_order_id."""
    if not settings.FOOD_BUNDLES_API_URL or not settings.FOOD_BUNDLES_API_KEY:
        logger.warning("order_sync_skipped_no_config", order_id=order_id)
        return

    async with AsyncSessionFactory() as db:
        await _do_sync(db, order_id=uuid.UUID(order_id), kitchen_id=uuid.UUID(kitchen_id))


async def _do_sync(db: AsyncSession, *, order_id: uuid.UUID, kitchen_id: uuid.UUID) -> None:
    repo = OrderRepository(db)
    order = await repo.get_with_lines(order_id)
    if order is None or str(order.kitchen_id) != str(kitchen_id):
        logger.warning("order_sync_not_found", order_id=str(order_id))
        return
    if order.status not in (OrderStatus.SUBMITTED, OrderStatus.CONFIRMED):
        logger.info("order_sync_skip_status", order_id=str(order_id), status=order.status)
        return

    payload = {
        "external_ref": str(order.id),
        "kitchen_id": str(order.kitchen_id),
        "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
        "notes": order.notes,
        "lines": [
            {
                "sku": line.catalog_product_id,
                "product_name": line.product_name,
                "unit": line.unit,
                "quantity": str(line.quantity_ordered),
                "unit_price": str(line.unit_price),
            }
            for line in order.lines
        ],
    }
    headers = {
        "Authorization": f"Bearer {settings.FOOD_BUNDLES_API_KEY}",
        "Content-Type": "application/json",
    }
    url = f"{settings.FOOD_BUNDLES_API_URL.rstrip('/')}/api/v1/orders"

    try:
        async with httpx.AsyncClient(timeout=15.0, verify=_ssl_context) as client:
            resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code in (200, 201):
            data = resp.json()
            external_id = data.get("id") or data.get("order_id")
            if external_id:
                order.external_order_id = str(external_id)
                await repo.update(order)
            logger.info("order_synced", order_id=str(order_id), external_id=external_id)
        else:
            logger.warning(
                "order_sync_api_error",
                order_id=str(order_id),
                status=resp.status_code,
                body=resp.text[:200],
            )
    except Exception:
        logger.exception("order_sync_failed", order_id=str(order_id))
