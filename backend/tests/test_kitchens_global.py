"""Step 2a build step 1: kitchens anywhere — currency, zone and country; catalogue by country;
the Assistant's "today" in the kitchen's own zone."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from app.core.security import create_access_token
from app.modules.ai.agent_service import _build_kitchen_context
from app.modules.chefs.models import Chef
from app.modules.kitchens.models import Kitchen
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

_PHONE = [0]


async def _headers(db: AsyncSession) -> dict:
    _PHONE[0] += 1
    chef = Chef(phone_number=f"+2507820{_PHONE[0]:05d}", name="Global Chef")
    db.add(chef)
    await db.flush()
    return {"Authorization": f"Bearer {create_access_token(str(chef.id))}"}


async def _kitchen(client: AsyncClient, headers: dict, **fields: str) -> dict:
    body = {"name": "K", "currency": "EUR", "timezone": "Europe/Paris", "country": "FR", **fields}
    resp = await client.post("/api/v1/kitchens", json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_kitchen_in_eur_is_created_with_its_own_settings(
    client: AsyncClient, db: AsyncSession
) -> None:
    headers = await _headers(db)
    k = await _kitchen(client, headers, currency="eur", country="fr")
    assert (k["currency"], k["timezone"], k["country"]) == ("EUR", "Europe/Paris", "FR")
    assert k["catalog_available"] is False


async def test_rwanda_kitchen_sees_the_catalogue(client: AsyncClient, db: AsyncSession) -> None:
    headers = await _headers(db)
    k = await _kitchen(client, headers, currency="RWF", timezone="Africa/Kigali", country="RW")
    assert k["catalog_available"] is True


@pytest.mark.parametrize(
    "bad",
    [{"currency": "XYZ"}, {"currency": "BOV"}, {"timezone": "Mars/Base"}, {"country": "ZZ"}],
)
async def test_invalid_kitchen_settings_are_rejected(
    client: AsyncClient, db: AsyncSession, bad: dict
) -> None:
    headers = await _headers(db)
    body = {"name": "K", "currency": "EUR", "timezone": "Europe/Paris", "country": "FR", **bad}
    resp = await client.post("/api/v1/kitchens", json=body, headers=headers)
    assert resp.status_code == 422


@pytest.mark.parametrize("missing", ["currency", "timezone", "country"])
async def test_no_country_defaults_are_assumed(
    client: AsyncClient, db: AsyncSession, missing: str
) -> None:
    headers = await _headers(db)
    body = {"name": "K", "currency": "EUR", "timezone": "Europe/Paris", "country": "FR"}
    body.pop(missing)
    resp = await client.post("/api/v1/kitchens", json=body, headers=headers)
    assert resp.status_code == 422


async def test_currency_changes_only_through_the_confirmation_flow(
    client: AsyncClient, db: AsyncSession
) -> None:
    headers = await _headers(db)
    k = await _kitchen(client, headers)
    url = f"/api/v1/kitchens/{k['id']}"
    same = await client.patch(url, json={"currency": "EUR"}, headers=headers)
    assert same.status_code == 200
    changed = await client.patch(url, json={"currency": "USD"}, headers=headers)
    assert changed.status_code == 409
    assert changed.json()["error"]["code"] == "CURRENCY_CHANGE_REQUIRES_CONFIRMATION"
    zone = await client.patch(url, json={"timezone": "America/New_York"}, headers=headers)
    assert zone.json()["timezone"] == "America/New_York"


async def test_catalogue_items_only_where_food_bundles_operates(
    client: AsyncClient, db: AsyncSession
) -> None:
    headers = await _headers(db)
    k = await _kitchen(client, headers)  # France: not served

    def order(product: str) -> dict:
        return {
            "delivery_date": "2026-11-25",
            "lines": [
                {
                    "catalog_product_id": product,
                    "product_name": "Tomatoes",
                    "unit": "kg",
                    "quantity_ordered": "5",
                    "unit_price": "2.50",
                }
            ],
        }

    blocked = await client.post(
        f"/api/v1/kitchens/{k['id']}/orders", json=order("FB-TOM-1KG"), headers=headers
    )
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "CATALOG_NOT_AVAILABLE"
    manual = await client.post(
        f"/api/v1/kitchens/{k['id']}/orders", json=order("manual"), headers=headers
    )
    assert manual.status_code == 201, manual.text


async def test_assistant_today_is_the_kitchens_today_across_midnight(
    client: AsyncClient, db: AsyncSession
) -> None:
    """At 23:30 UTC on 18 Nov it is already 19 Nov in Auckland: sales on the 19th are 'today'."""
    headers = await _headers(db)
    k = await _kitchen(client, headers, currency="NZD", timezone="Pacific/Auckland", country="NZ")
    kid = k["id"]
    menu = (
        await client.post(f"/api/v1/kitchens/{kid}/menus", json={"name": "Main"}, headers=headers)
    ).json()
    item = (
        await client.post(
            f"/api/v1/kitchens/{kid}/menus/{menu['id']}/items",
            json={"name": "Fish and chips", "selling_price": "24.50", "category": "main"},
            headers=headers,
        )
    ).json()
    sale = await client.post(
        f"/api/v1/kitchens/{kid}/sales",
        json={"menu_item_id": item["id"], "sale_date": "2026-11-19", "portions_sold": 7},
        headers=headers,
    )
    assert sale.status_code == 201, sale.text
    kitchen = (
        await db.execute(select(Kitchen).where(Kitchen.id == kitchen_uuid(kid)))
    ).scalar_one()

    late_utc = datetime(2026, 11, 18, 23, 30, tzinfo=UTC)
    context, _ = await _build_kitchen_context(kitchen, db, now=late_utc)
    line = next(row for row in context.splitlines() if "Fish and chips" in row)
    assert line.rstrip().endswith("| 7"), line  # sold "today" in Auckland

    earlier_utc = datetime(2026, 11, 18, 10, 0, tzinfo=UTC)  # still 18 Nov in Auckland (23:00)
    context, _ = await _build_kitchen_context(kitchen, db, now=earlier_utc)
    line = next(row for row in context.splitlines() if "Fish and chips" in row)
    assert line.rstrip().endswith("| 0"), line


def kitchen_uuid(value: str):
    import uuid

    return uuid.UUID(value)


async def test_assistant_context_lists_open_orders(client: AsyncClient, db: AsyncSession) -> None:
    """Regression: order status is a plain string column; `.value` on it failed silently and the
    Assistant said "Order data unavailable" for every kitchen with orders."""
    headers = await _headers(db)
    k = await _kitchen(client, headers)
    order = await client.post(
        f"/api/v1/kitchens/{k['id']}/orders",
        json={
            "delivery_date": "2026-11-25",
            "lines": [
                {
                    "catalog_product_id": "manual",
                    "product_name": "Tomatoes",
                    "unit": "kg",
                    "quantity_ordered": "5",
                    "unit_price": "2.50",
                }
            ],
        },
        headers=headers,
    )
    assert order.status_code == 201, order.text
    kitchen = (
        await db.execute(select(Kitchen).where(Kitchen.id == kitchen_uuid(k["id"])))
    ).scalar_one()
    context, known = await _build_kitchen_context(kitchen, db)
    assert "Order data unavailable" not in context
    assert "status=confirmed" in context
    assert known.orders == {order.json()["id"]: "confirmed"}
