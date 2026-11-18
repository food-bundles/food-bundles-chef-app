"""Sales deduct recipe ingredients from stock; stock changes add/remove/set (device bug #1 flow).

Hand calculation: Chips uses 0.25 kg Potato per portion (yield 1).
  500 kg - 10 x 0.25 kg = 497.5 kg
Correcting today's sales to 12 uses 2 x 0.25 = 0.5 kg more -> 497.0 kg;
correcting down to 8 returns 1.0 kg -> 498.0 kg.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest
from app.core.security import create_access_token
from app.modules.chefs.models import Chef
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

_PHONE_COUNTER = 7000


def _next_phone() -> str:
    global _PHONE_COUNTER
    _PHONE_COUNTER += 1
    return f"+2507810{_PHONE_COUNTER:05d}"


async def _auth_headers(db: AsyncSession) -> dict:
    """A chef in the test database with a signed access token — no OTP, so no SMS is sent."""
    chef = Chef(phone_number=_next_phone(), name="Test Chef")
    db.add(chef)
    await db.flush()
    return {"Authorization": f"Bearer {create_access_token(str(chef.id))}"}


async def _potato_and_chips(client: AsyncClient, headers: dict) -> tuple[str, str, str]:
    kitchen = await client.post(
        "/api/v1/kitchens",
        json={"name": "Stock Kitchen", "currency": "RWF", "timezone": "Africa/Kigali"},
        headers=headers,
    )
    assert kitchen.status_code == 201
    kid = kitchen.json()["id"]
    potato = await client.post(
        f"/api/v1/kitchens/{kid}/ingredients",
        json={"name": "Potato", "unit": "kg", "cost_per_unit": "600"},
        headers=headers,
    )
    assert potato.status_code == 201
    pid = potato.json()["id"]
    opening = await client.post(
        f"/api/v1/kitchens/{kid}/inventory",
        json={"ingredient_id": pid, "quantity": "500", "change": "set", "entry_type": "opening"},
        headers=headers,
    )
    assert opening.status_code == 201
    menu = await client.post(
        f"/api/v1/kitchens/{kid}/menus", json={"name": "Main"}, headers=headers
    )
    assert menu.status_code == 201
    chips = await client.post(
        f"/api/v1/kitchens/{kid}/menus/{menu.json()['id']}/items",
        json={"name": "Chips", "selling_price": "1500", "category": "side"},
        headers=headers,
    )
    assert chips.status_code == 201
    cid = chips.json()["id"]
    line = await client.post(
        f"/api/v1/kitchens/{kid}/menu-items/{cid}/recipe",
        json={"ingredient_id": pid, "qty_per_portion": "0.25", "unit": "kg"},
        headers=headers,
    )
    assert line.status_code == 201
    return kid, pid, cid


async def _stock(client: AsyncClient, headers: dict, kid: str, pid: str) -> Decimal:
    resp = await client.get(f"/api/v1/kitchens/{kid}/inventory", headers=headers)
    assert resp.status_code == 200
    row = next(r for r in resp.json() if r["ingredient_id"] == pid)
    return Decimal(str(row["current_stock"]))


async def _sell(client: AsyncClient, headers: dict, kid: str, cid: str, portions: int) -> None:
    resp = await client.post(
        f"/api/v1/kitchens/{kid}/sales",
        json={
            "menu_item_id": cid,
            "sale_date": date.today().isoformat(),
            "portions_sold": portions,
        },
        headers=headers,
    )
    assert resp.status_code == 201


async def test_ten_chips_sold_leave_497_5_kg_potato(client: AsyncClient, db: AsyncSession) -> None:
    headers = await _auth_headers(db)
    kid, pid, cid = await _potato_and_chips(client, headers)

    await _sell(client, headers, kid, cid, 10)
    assert await _stock(client, headers, kid, pid) == Decimal("497.5")


async def test_correcting_todays_sales_applies_only_the_difference(
    client: AsyncClient, db: AsyncSession
) -> None:
    headers = await _auth_headers(db)
    kid, pid, cid = await _potato_and_chips(client, headers)

    await _sell(client, headers, kid, cid, 10)
    await _sell(client, headers, kid, cid, 12)
    assert await _stock(client, headers, kid, pid) == Decimal("497.0")
    await _sell(client, headers, kid, cid, 8)
    assert await _stock(client, headers, kid, pid) == Decimal("498.0")


async def test_stock_add_remove_and_set(client: AsyncClient, db: AsyncSession) -> None:
    headers = await _auth_headers(db)
    kid, pid, _ = await _potato_and_chips(client, headers)

    async def change(kind: str, qty: str) -> None:
        resp = await client.post(
            f"/api/v1/kitchens/{kid}/inventory",
            json={
                "ingredient_id": pid,
                "quantity": qty,
                "change": kind,
                "entry_type": "adjustment",
            },
            headers=headers,
        )
        assert resp.status_code == 201

    await change("add", "20")
    assert await _stock(client, headers, kid, pid) == Decimal("520")
    await change("remove", "2.5")
    assert await _stock(client, headers, kid, pid) == Decimal("517.5")
    await change("set", "300")
    assert await _stock(client, headers, kid, pid) == Decimal("300")
