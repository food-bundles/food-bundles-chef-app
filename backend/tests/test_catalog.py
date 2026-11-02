"""Catalog product listing and lookup tests (BE020)."""
from __future__ import annotations

import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.models import CatalogProduct

pytestmark = pytest.mark.asyncio


async def _get_tokens(client: AsyncClient, monkeypatch, phone: str) -> dict:
    import app.core.config as cfg

    monkeypatch.setattr(cfg.settings, "MOCK_OTP_CODE", "888888")
    await client.post("/api/v1/auth/otp/request", json={"phone_number": phone})
    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"phone_number": phone, "code": "888888"},
    )
    assert resp.status_code == 200
    return resp.json()


def _auth(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def _seed_products(db: AsyncSession) -> list[CatalogProduct]:
    products = [
        CatalogProduct(
            sku="FB-VEG-001",
            name="Tomatoes",
            category="Vegetables",
            unit="kg",
            reference_price=Decimal("1500.00"),
        ),
        CatalogProduct(
            sku="FB-VEG-002",
            name="Onions",
            category="Vegetables",
            unit="kg",
            reference_price=Decimal("800.00"),
        ),
        CatalogProduct(
            sku="FB-OIL-001",
            name="Cooking Oil",
            category="Oils & Fats",
            unit="litre",
            reference_price=Decimal("4200.00"),
        ),
    ]
    for p in products:
        db.add(p)
    await db.flush()
    return products


async def test_catalog_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/catalog/products")
    assert resp.status_code == 401


async def test_list_catalog_products_empty(
    client: AsyncClient, monkeypatch
) -> None:
    tokens = await _get_tokens(client, monkeypatch, "+250780090001")
    resp = await client.get("/api/v1/catalog/products", headers=_auth(tokens))
    assert resp.status_code == 200
    # May have products from other test seeds; just check it's a list
    assert isinstance(resp.json(), list)


async def test_list_catalog_products_with_data(
    client: AsyncClient, monkeypatch, db: AsyncSession
) -> None:
    tokens = await _get_tokens(client, monkeypatch, "+250780090002")
    await _seed_products(db)

    resp = await client.get("/api/v1/catalog/products", headers=_auth(tokens))
    assert resp.status_code == 200
    skus = {p["sku"] for p in resp.json()}
    assert "FB-VEG-001" in skus
    assert "FB-VEG-002" in skus
    assert "FB-OIL-001" in skus


async def test_list_catalog_products_filter_by_category(
    client: AsyncClient, monkeypatch, db: AsyncSession
) -> None:
    tokens = await _get_tokens(client, monkeypatch, "+250780090003")
    await _seed_products(db)

    resp = await client.get(
        "/api/v1/catalog/products",
        params={"category": "Vegetables"},
        headers=_auth(tokens),
    )
    assert resp.status_code == 200
    products = resp.json()
    assert all(p["category"] == "Vegetables" for p in products)
    skus = {p["sku"] for p in products}
    assert "FB-VEG-001" in skus
    assert "FB-OIL-001" not in skus


async def test_get_catalog_product_by_sku(
    client: AsyncClient, monkeypatch, db: AsyncSession
) -> None:
    tokens = await _get_tokens(client, monkeypatch, "+250780090004")
    await _seed_products(db)

    resp = await client.get(
        "/api/v1/catalog/products/FB-VEG-001",
        headers=_auth(tokens),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["sku"] == "FB-VEG-001"
    assert body["name"] == "Tomatoes"
    assert body["category"] == "Vegetables"
    assert body["unit"] == "kg"
    assert float(body["reference_price"]) == 1500.0


async def test_get_catalog_product_not_found(
    client: AsyncClient, monkeypatch
) -> None:
    tokens = await _get_tokens(client, monkeypatch, "+250780090005")
    resp = await client.get(
        "/api/v1/catalog/products/FB-DOESNOTEXIST-999",
        headers=_auth(tokens),
    )
    assert resp.status_code == 404
