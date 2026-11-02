"""Integration tests for the purchasing suggestion pipeline.

Validates the full flow: sales data → weighted demand → purchase_quantity.
All expected values hand-calculated.
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def _auth(client: AsyncClient, monkeypatch, phone: str) -> dict:
    import app.core.config as cfg
    monkeypatch.setattr(cfg.settings, "MOCK_OTP_CODE", "333333")
    await client.post("/api/v1/auth/otp/request", json={"phone_number": phone})
    r = await client.post(
        "/api/v1/auth/otp/verify", json={"phone_number": phone, "code": "333333"}
    )
    return r.json()


def _h(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def test_purchasing_suggestions_empty_kitchen(
    client: AsyncClient, monkeypatch
) -> None:
    tokens = await _auth(client, monkeypatch, "+250780002001")

    kitchen = (
        await client.post(
            "/api/v1/kitchens",
            json={"name": "Empty Kitchen", "currency": "RWF", "timezone": "Africa/Kigali"},
            headers=_h(tokens),
        )
    ).json()
    kid = kitchen["id"]

    r = await client.get(f"/api/v1/kitchens/{kid}/purchasing/suggestions", headers=_h(tokens))
    assert r.status_code == 200
    assert r.json()["suggestions"] == []


async def test_purchasing_suggestions_with_sales_data(
    client: AsyncClient, monkeypatch
) -> None:
    """Full pipeline: ingredient → menu → recipe line → sales → suggestion.

    Hand calculation:
      ingredient: qty_per_portion=0.5 kg, yield=0.8, selling_unit=5 kg, stock=2 kg
      sales last 4 weeks: [100, 80, 60, 40] portions
      weighted demand = 0.40*100 + 0.20*80 + 0.20*60 + 0.20*40 = 76 portions
      demand_qty (ingredient level) = 76 * 0.5 / 0.8 = 47.5 kg
      purchase_quantity:
        gross = 47.5 * 1.10 (10% buffer) = 52.25 kg
        raw = 52.25 - 2 = 50.25 kg
        ceil(50.25 / 5) * 5 = ceil(10.05) * 5 = 11 * 5 = 55 kg
    """
    tokens = await _auth(client, monkeypatch, "+250780002002")
    h = _h(tokens)

    kitchen = (
        await client.post(
            "/api/v1/kitchens",
            json={"name": "Test Kitchen", "currency": "RWF", "timezone": "Africa/Kigali"},
            headers=h,
        )
    ).json()
    kid = kitchen["id"]

    # Create ingredient
    ing = (
        await client.post(
            f"/api/v1/kitchens/{kid}/ingredients",
            json={
                "name": "Tomatoes",
                "unit": "kg",
                "yield_fraction": "0.8",
                "qty_per_portion": "0.5",
                "cost_per_unit": "500",
                "selling_unit_size": "5",
                "days_open_per_week": 7,
            },
            headers=h,
        )
    ).json()
    ing_id = ing["id"]

    # Set stock to 2 kg
    await client.post(
        f"/api/v1/kitchens/{kid}/inventory",
        json={"ingredient_id": ing_id, "quantity": "2.0", "entry_type": "opening"},
        headers=h,
    )

    # Create menu and item
    menu = (
        await client.post(
            f"/api/v1/kitchens/{kid}/menus",
            json={"name": "Main Menu"},
            headers=h,
        )
    ).json()
    item = (
        await client.post(
            f"/api/v1/kitchens/{kid}/menus/{menu['id']}/items",
            json={"name": "Tomato Dish", "selling_price": "3000"},
            headers=h,
        )
    ).json()
    item_id = item["id"]

    # Add recipe line
    await client.post(
        f"/api/v1/kitchens/{kid}/menu-items/{item_id}/recipe",
        json={
            "ingredient_id": ing_id,
            "qty_per_portion": "0.5",
            "unit": "kg",
        },
        headers=h,
    )

    # Record 4 weeks of sales (most recent first via sale_date)
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    weekly_portions = [100, 80, 60, 40]
    for i, portions in enumerate(weekly_portions):
        # week i+1 ago
        sale_date = monday - timedelta(weeks=i + 1)
        await client.post(
            f"/api/v1/kitchens/{kid}/sales",
            json={
                "menu_item_id": item_id,
                "sale_date": str(sale_date),
                "portions_sold": portions,
            },
            headers=h,
        )

    # Get suggestions
    r = await client.get(f"/api/v1/kitchens/{kid}/purchasing/suggestions", headers=h)
    assert r.status_code == 200
    suggestions = r.json()["suggestions"]
    assert len(suggestions) == 1

    s = suggestions[0]
    assert s["ingredient_name"] == "Tomatoes"
    assert Decimal(s["suggested_qty"]) == Decimal("55")
    assert s["is_low_stock"] is True  # 2 kg / daily_use < 1 day
