"""Phase 9 (05–08 Commands): numbering, statuses, stock movements, staff, sync dedupe."""

from __future__ import annotations

import uuid
from decimal import Decimal

import pytest
from app.core.security import create_access_token
from app.modules.chefs.models import Chef
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

_PHONE = [0]


async def _kitchen(client: AsyncClient, db: AsyncSession) -> tuple[dict, str, str, str]:
    """Kitchen with Chicken Legs (0.3 kg chicken per portion) and 0.6 kg chicken in stock."""
    _PHONE[0] += 1
    chef = Chef(phone_number=f"+2507860{_PHONE[0]:05d}", name="Eric")
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
        await client.post(
            f"{base}/ingredients",
            json={"name": "Chicken", "unit": "kg", "cost_per_unit": "4500"},
            headers=h,
        )
    ).json()["id"]
    await client.post(
        f"{base}/inventory",
        json={"ingredient_id": ing, "quantity": "0.6", "entry_type": "opening"},
        headers=h,
    )
    menu = (await client.post(f"{base}/menus", json={"name": "Menu"}, headers=h)).json()["id"]
    dish = (
        await client.post(
            f"{base}/menus/{menu}/items",
            json={"name": "Chicken Legs", "selling_price": "5000", "category": "main"},
            headers=h,
        )
    ).json()["id"]
    resp = await client.post(
        f"{base}/menu-items/{dish}/recipe",
        json={"ingredient_id": ing, "qty_per_portion": "0.3", "unit": "kg"},
        headers=h,
    )
    assert resp.status_code in (200, 201), resp.text
    return h, base, dish, ing


async def _stock(client: AsyncClient, h: dict, base: str, ing: str) -> Decimal:
    levels = (await client.get(f"{base}/inventory", headers=h)).json()
    row = next(r for r in levels if r["ingredient_id"] == ing)
    return Decimal(str(row["current_stock"]))


async def test_chef_command_goes_to_cooking_and_takes_stock(client: AsyncClient, db: AsyncSession) -> None:
    h, base, dish, ing = await _kitchen(client, db)
    resp = await client.post(
        f"{base}/commands",
        json={"type": "dine_in", "table_no": "4", "lines": [{"menu_item_id": dish, "qty": 1}]},
        headers=h,
    )
    assert resp.status_code == 201, resp.text
    cmd = resp.json()
    assert (cmd["number"], cmd["status"], cmd["recorded_by_role"]) == (1, "cooking", "chef")
    assert await _stock(client, h, base, ing) == Decimal("0.3")

    today = (await client.get(f"{base}/commands/today", headers=h)).json()
    dish_today = next(d for d in today["dishes"] if d["menu_item_id"] == dish)
    assert (dish_today["ordered_today"], dish_today["can_make"]) == (1, 1)
    assert today["next_number"] == 2


async def test_waiter_command_waits_as_new_with_stock_check(client: AsyncClient, db: AsyncSession) -> None:
    h, base, dish, ing = await _kitchen(client, db)
    staff = (
        await client.post(f"{base}/staff", json={"name": "Jean", "role": "waiter"}, headers=h)
    ).json()
    cmd = (
        await client.post(
            f"{base}/commands",
            json={"type": "to_go", "staff_id": staff["id"], "lines": [{"menu_item_id": dish, "qty": 3}]},
            headers=h,
        )
    ).json()
    assert (cmd["status"], cmd["recorded_by_name"]) == ("new", "Jean")
    assert await _stock(client, h, base, ing) == Decimal("0.6"), "New takes nothing yet"

    detail = (await client.get(f"{base}/commands/{cmd['id']}", headers=h)).json()
    check = detail["stock_check"]
    assert check["enough"] is False
    (missing,) = check["missing"]
    assert Decimal(missing["need"]) == Decimal("0.9")
    assert Decimal(missing["have"]) == Decimal("0.6")
    assert Decimal(missing["short"]) == Decimal("0.3")
    assert (check["max_portions"], check["total_portions"]) == (2, 3)
    assert check["decline_message"] == "Declined – not enough Chicken (short 0.3 kg)."


async def test_accept_2_of_3_then_cancel_puts_stock_back(client: AsyncClient, db: AsyncSession) -> None:
    h, base, dish, ing = await _kitchen(client, db)
    staff = (await client.post(f"{base}/staff", json={"name": "Jean", "role": "waiter"}, headers=h)).json()
    cmd = (
        await client.post(
            f"{base}/commands",
            json={"type": "to_go", "staff_id": staff["id"], "lines": [{"menu_item_id": dish, "qty": 3}]},
            headers=h,
        )
    ).json()
    line_id = cmd["lines"][0]["id"]
    accepted = await client.post(
        f"{base}/commands/{cmd['id']}/accept", json={"portions": {line_id: 2}}, headers=h
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["lines"][0]["accepted_qty"] == 2
    assert await _stock(client, h, base, ing) == Decimal("0")

    # To go is Handed, not Served.
    assert (await client.post(f"{base}/commands/{cmd['id']}/serve", headers=h)).json()["status"] == "handed"

    other = (
        await client.post(
            f"{base}/commands", json={"type": "dine_in", "lines": [{"menu_item_id": dish, "qty": 1}]}, headers=h
        )
    ).json()
    assert other["status"] == "cooking"
    cancelled = await client.post(f"{base}/commands/{other['id']}/cancel", headers=h)
    assert cancelled.json()["status"] == "cancelled"


async def test_decline_takes_nothing_and_rejects_other_transitions(client: AsyncClient, db: AsyncSession) -> None:
    h, base, dish, ing = await _kitchen(client, db)
    staff = (await client.post(f"{base}/staff", json={"name": "Alice", "role": "cashier"}, headers=h)).json()
    cmd = (
        await client.post(
            f"{base}/commands",
            json={"type": "dine_in", "table_no": "2", "staff_id": staff["id"], "lines": [{"menu_item_id": dish, "qty": 3}]},
            headers=h,
        )
    ).json()
    declined = await client.post(
        f"{base}/commands/{cmd['id']}/decline", json={"add_to_requisition": True}, headers=h
    )
    assert declined.json()["status"] == "declined"
    assert await _stock(client, h, base, ing) == Decimal("0.6")
    # Declined cannot be served or accepted.
    assert (await client.post(f"{base}/commands/{cmd['id']}/serve", headers=h)).status_code == 409
    accept = await client.post(f"{base}/commands/{cmd['id']}/accept", json={}, headers=h)
    assert accept.status_code == 409
    today = (await client.get(f"{base}/commands/today", headers=h)).json()
    assert next(d for d in today["dishes"] if d["menu_item_id"] == dish)["ordered_today"] == 0


async def test_same_client_id_is_one_command(client: AsyncClient, db: AsyncSession) -> None:
    h, base, dish, ing = await _kitchen(client, db)
    cid = str(uuid.uuid4())
    body = {"id": cid, "type": "dine_in", "lines": [{"menu_item_id": dish, "qty": 1}]}
    first = await client.post(f"{base}/commands", json=body, headers=h)
    second = await client.post(f"{base}/commands", json=body, headers=h)
    assert first.json()["id"] == second.json()["id"] == cid
    assert await _stock(client, h, base, ing) == Decimal("0.3"), "stock taken once"


async def test_sync_never_applies_an_operation_twice(client: AsyncClient, db: AsyncSession) -> None:
    h, base, dish, ing = await _kitchen(client, db)
    kitchen_id = base.rsplit("/", 1)[-1]
    op_id = str(uuid.uuid4())
    payload = {
        "kitchen_id": kitchen_id,
        "mutations": [
            {
                "operation_id": op_id,
                "operation_type": "record_inventory",
                "resource_id": "",
                "payload": {"ingredient_id": ing, "quantity": "5.6", "entry_type": "delivery"},
                "queued_at": "2026-11-18T07:40:00Z",
            }
        ],
    }
    first = (await client.post("/api/v1/sync", json=payload, headers=h)).json()
    second = (await client.post("/api/v1/sync", json=payload, headers=h)).json()
    assert first["results"][0]["status"] == "applied"
    assert second["results"][0]["status"] == "skipped"


async def test_staff_list(client: AsyncClient, db: AsyncSession) -> None:
    h, base, _, _ = await _kitchen(client, db)
    await client.post(f"{base}/staff", json={"name": "Alice", "role": "waiter"}, headers=h)
    staff = (await client.get(f"{base}/staff", headers=h)).json()
    assert [(s["name"], s["role"]) for s in staff] == [("Alice", "waiter")]
    bad = await client.post(f"{base}/staff", json={"name": "Bob", "role": "manager"}, headers=h)
    assert bad.status_code == 422
