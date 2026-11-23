"""Phase 9 (10 Today's stock): Start · In · Used · Left, Count and "used by"."""

from __future__ import annotations

from decimal import Decimal

import pytest
from app.core.security import create_access_token
from app.modules.chefs.models import Chef
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

_PHONE = [0]


async def test_stock_day_count_and_used_by(client: AsyncClient, db: AsyncSession) -> None:
    _PHONE[0] += 1
    chef = Chef(phone_number=f"+2507870{_PHONE[0]:05d}", name="Eric")
    db.add(chef)
    await db.flush()
    h = {"Authorization": f"Bearer {create_access_token(str(chef.id))}"}
    body = {
        "name": "Food Court",
        "currency": "RWF",
        "timezone": "Africa/Kigali",
        "country": "RW",
        "opening_time": "00:00",
        "closing_time": "23:59",
    }
    kid = (await client.post("/api/v1/kitchens", json=body, headers=h)).json()["id"]
    base = f"/api/v1/kitchens/{kid}"
    ing = (
        await client.post(f"{base}/ingredients", json={"name": "Chicken", "unit": "kg"}, headers=h)
    ).json()["id"]
    await client.post(
        f"{base}/inventory", json={"ingredient_id": ing, "quantity": "6.0", "entry_type": "delivery"}, headers=h
    )
    menu = (await client.post(f"{base}/menus", json={"name": "Menu"}, headers=h)).json()["id"]
    dish = (
        await client.post(
            f"{base}/menus/{menu}/items", json={"name": "Chicken Legs", "selling_price": "5000"}, headers=h
        )
    ).json()["id"]
    await client.post(
        f"{base}/menu-items/{dish}/recipe",
        json={"ingredient_id": ing, "qty_per_portion": "0.3", "unit": "kg"},
        headers=h,
    )
    await client.post(
        f"{base}/commands", json={"type": "dine_in", "lines": [{"menu_item_id": dish, "qty": 3}]}, headers=h
    )

    day = (await client.get(f"{base}/stock/today", headers=h)).json()
    row = next(r for r in day["rows"] if r["ingredient_id"] == ing)
    assert Decimal(row["received"]) == Decimal("6.0")
    assert Decimal(row["used"]) == Decimal("0.9")
    assert Decimal(row["left"]) == Decimal("5.1")

    used_by = (await client.get(f"{base}/stock/{ing}/used-by", headers=h)).json()
    assert [(u["dish_name"], u["portions"]) for u in used_by] == [("Chicken Legs", 3)]
    assert Decimal(used_by[0]["quantity"]) == Decimal("0.9")

    counted = await client.post(
        f"{base}/stock/count", json={"ingredient_id": ing, "counted": "5.0", "reason": "waste"}, headers=h
    )
    assert counted.status_code == 201, counted.text
    row = next(r for r in counted.json()["rows"] if r["ingredient_id"] == ing)
    assert Decimal(row["left"]) == Decimal("5.0")
    assert Decimal(row["counted"]) == Decimal("-0.1")
