"""Phase 9 (04 Receive): quality tag and issue reasons per received line."""

from __future__ import annotations

import pytest
from app.core.security import create_access_token
from app.modules.chefs.models import Chef
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

_PHONE = [0]


async def _order(client: AsyncClient, db: AsyncSession) -> tuple[dict, str, str, list[str]]:
    _PHONE[0] += 1
    chef = Chef(phone_number=f"+2507850{_PHONE[0]:05d}", name="Receive Chef")
    db.add(chef)
    await db.flush()
    headers = {"Authorization": f"Bearer {create_access_token(str(chef.id))}"}
    body = {"name": "Food Court", "currency": "RWF", "timezone": "Africa/Kigali", "country": "RW"}
    kitchen_id = (await client.post("/api/v1/kitchens", json=body, headers=headers)).json()["id"]
    lines = [
        ("FB-POTATO", "Potatoes", "8.000"),
        ("FB-CARROT", "Carrots", "1.000"),
    ]
    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders",
        json={
            "delivery_date": "2026-11-18",
            "lines": [
                {
                    "catalog_product_id": sku,
                    "product_name": name,
                    "unit": "kg",
                    "quantity_ordered": qty,
                    "unit_price": "600",
                }
                for sku, name, qty in lines
            ],
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    order = resp.json()
    detail = await client.get(f"/api/v1/kitchens/{kitchen_id}/orders/{order['id']}", headers=headers)
    return headers, kitchen_id, order["id"], [line["id"] for line in detail.json()["lines"]]


async def test_short_weight_issue_is_recorded(client: AsyncClient, db: AsyncSession) -> None:
    headers, kitchen_id, order_id, (potatoes, carrots) = await _order(client, db)
    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}/receiving",
        json={
            "lines": [
                # Mockup p.4: Potatoes ordered 8 kg, 7.0 received, Issue · Short weight.
                {
                    "order_line_id": potatoes,
                    "quantity_received": "7.0",
                    "quality": "issue",
                    "issue_reasons": ["short_weight"],
                },
                # Carrots not checked: counts as not received.
                {
                    "order_line_id": carrots,
                    "quantity_received": "0",
                    "decision": "rejected",
                    "rejection_reason": "not_received",
                },
            ]
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    by_line = {r["order_line_id"]: r for r in resp.json()}
    assert by_line[potatoes]["quality"] == "issue"
    assert by_line[potatoes]["issue_reasons"] == ["short_weight"]
    assert by_line[potatoes]["short_delivery"] is True
    assert by_line[carrots]["decision"] == "rejected"


async def test_unknown_issue_reason_is_rejected(client: AsyncClient, db: AsyncSession) -> None:
    headers, kitchen_id, order_id, (potatoes, _) = await _order(client, db)
    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}/receiving",
        json={
            "lines": [
                {
                    "order_line_id": potatoes,
                    "quantity_received": "8",
                    "quality": "issue",
                    "issue_reasons": ["smelly"],
                }
            ]
        },
        headers=headers,
    )
    assert resp.status_code == 422
