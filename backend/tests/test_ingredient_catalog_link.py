"""Phase 9 (09 Menu & recipe): ingredients linked to the Food Bundles catalogue."""

from __future__ import annotations

from decimal import Decimal

import pytest
from app.core.security import create_access_token
from app.modules.catalog.models import CatalogProduct
from app.modules.chefs.models import Chef
from app.modules.ingredients.models import Ingredient
from app.modules.ingredients.service import sync_catalog_prices
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

_PHONE = [0]


async def _setup(client: AsyncClient, db: AsyncSession) -> tuple[dict, str, CatalogProduct]:
    _PHONE[0] += 1
    chef = Chef(phone_number=f"+2507840{_PHONE[0]:05d}", name="Recipe Chef")
    db.add(chef)
    product = CatalogProduct(
        sku=f"FB-CHICKEN-{_PHONE[0]}",
        name="Chicken",
        category="meat",
        unit="kg",
        reference_price=Decimal("4500"),
        reference_price_minor=4500,
        reference_price_currency="RWF",
        is_active=True,
    )
    db.add(product)
    await db.flush()
    headers = {"Authorization": f"Bearer {create_access_token(str(chef.id))}"}
    body = {"name": "Food Court", "currency": "RWF", "timezone": "Africa/Kigali", "country": "RW"}
    kitchen = (await client.post("/api/v1/kitchens", json=body, headers=headers)).json()
    return headers, kitchen["id"], product


async def test_linked_ingredient_takes_the_food_bundles_price(
    client: AsyncClient, db: AsyncSession
) -> None:
    headers, kitchen_id, product = await _setup(client, db)
    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/ingredients",
        json={"name": "Chicken", "unit": "kg", "catalog_product_id": str(product.id)},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["catalog_product_id"] == str(product.id)
    assert Decimal(data["cost_per_unit"]) == Decimal("4500")
    assert data["cost_per_unit_currency"] == "RWF"


async def test_unknown_catalogue_product_is_rejected(client: AsyncClient, db: AsyncSession) -> None:
    headers, kitchen_id, _ = await _setup(client, db)
    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/ingredients",
        json={
            "name": "Ghost",
            "unit": "kg",
            "catalog_product_id": "00000000-0000-0000-0000-000000000000",
        },
        headers=headers,
    )
    assert resp.status_code == 422


async def test_catalogue_refresh_updates_linked_costs(client: AsyncClient, db: AsyncSession) -> None:
    headers, kitchen_id, product = await _setup(client, db)
    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/ingredients",
        json={"name": "Chicken", "unit": "kg", "catalog_product_id": str(product.id)},
        headers=headers,
    )
    ingredient_id = resp.json()["id"]
    product.reference_price = Decimal("4800")
    assert await sync_catalog_prices(db, product) == 1
    ingredient = await db.get(Ingredient, __import__("uuid").UUID(ingredient_id))
    assert ingredient is not None
    await db.refresh(ingredient)
    assert ingredient.cost_per_unit == Decimal("4800")


async def test_custom_ingredient_keeps_its_own_price(client: AsyncClient, db: AsyncSession) -> None:
    headers, kitchen_id, _ = await _setup(client, db)
    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/ingredients",
        json={"name": "Mama's spice", "unit": "kg", "cost_per_unit": "2000"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["catalog_product_id"] is None
    assert Decimal(resp.json()["cost_per_unit"]) == Decimal("2000")
