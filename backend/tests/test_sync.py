"""Offline sync API tests.

Validates the QueuedMutation envelope processing:
- Mutations are applied in order
- Duplicate operation_ids in the same batch are skipped
- Per-mutation errors don't abort the batch
- Kitchen ownership is enforced at the sync endpoint level
"""
from __future__ import annotations

import uuid
from datetime import date

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def _auth(client: AsyncClient, monkeypatch, phone: str) -> dict:
    import app.core.config as cfg
    monkeypatch.setattr(cfg.settings, "MOCK_OTP_CODE", "444444")
    await client.post("/api/v1/auth/otp/request", json={"phone_number": phone})
    r = await client.post(
        "/api/v1/auth/otp/verify", json={"phone_number": phone, "code": "444444"}
    )
    return r.json()


def _h(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def test_sync_record_sale(client: AsyncClient, monkeypatch) -> None:
    tokens = await _auth(client, monkeypatch, "+250780003001")
    h = _h(tokens)

    kitchen = (
        await client.post(
            "/api/v1/kitchens",
            json={"name": "Sync Kitchen", "currency": "RWF", "timezone": "Africa/Kigali"},
            headers=h,
        )
    ).json()
    kid = kitchen["id"]

    menu = (
        await client.post(f"/api/v1/kitchens/{kid}/menus", json={"name": "Menu"}, headers=h)
    ).json()
    item = (
        await client.post(
            f"/api/v1/kitchens/{kid}/menus/{menu['id']}/items",
            json={"name": "Dish A", "selling_price": "2000"},
            headers=h,
        )
    ).json()

    op_id = str(uuid.uuid4())
    r = await client.post(
        "/api/v1/sync",
        json={
            "kitchen_id": kid,
            "mutations": [
                {
                    "operation_id": op_id,
                    "operation_type": "record_sale",
                    "resource_id": kid,
                    "payload": {
                        "menu_item_id": item["id"],
                        "sale_date": str(date.today()),
                        "portions_sold": 15,
                    },
                    "queued_at": "2026-11-01T08:00:00Z",
                    "client_status": "pending",
                }
            ],
        },
        headers=h,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["processed"] == 1
    result = body["results"][0]
    assert result["status"] == "applied"
    assert result["operation_id"] == op_id
    assert result["server_id"] is not None


async def test_sync_duplicate_operation_id_skipped(
    client: AsyncClient, monkeypatch
) -> None:
    tokens = await _auth(client, monkeypatch, "+250780003002")
    h = _h(tokens)

    kitchen = (
        await client.post(
            "/api/v1/kitchens",
            json={"name": "Dup Kitchen", "currency": "RWF", "timezone": "Africa/Kigali"},
            headers=h,
        )
    ).json()
    kid = kitchen["id"]

    menu = (await client.post(f"/api/v1/kitchens/{kid}/menus", json={"name": "M"}, headers=h)).json()
    item = (
        await client.post(
            f"/api/v1/kitchens/{kid}/menus/{menu['id']}/items",
            json={"name": "Dish B", "selling_price": "1500"},
            headers=h,
        )
    ).json()

    op_id = str(uuid.uuid4())
    mutation = {
        "operation_id": op_id,
        "operation_type": "record_sale",
        "resource_id": kid,
        "payload": {
            "menu_item_id": item["id"],
            "sale_date": str(date.today()),
            "portions_sold": 5,
        },
        "queued_at": "2026-11-01T09:00:00Z",
        "client_status": "pending",
    }

    r = await client.post(
        "/api/v1/sync",
        json={"kitchen_id": kid, "mutations": [mutation, mutation]},
        headers=h,
    )
    assert r.status_code == 200
    results = r.json()["results"]
    assert results[0]["status"] == "applied"
    assert results[1]["status"] == "skipped"


async def test_sync_invalid_mutation_returns_failed_not_500(
    client: AsyncClient, monkeypatch
) -> None:
    """A mutation referencing a non-existent resource fails gracefully."""
    tokens = await _auth(client, monkeypatch, "+250780003003")
    h = _h(tokens)

    kitchen = (
        await client.post(
            "/api/v1/kitchens",
            json={"name": "Fail Kitchen", "currency": "RWF", "timezone": "Africa/Kigali"},
            headers=h,
        )
    ).json()
    kid = kitchen["id"]

    r = await client.post(
        "/api/v1/sync",
        json={
            "kitchen_id": kid,
            "mutations": [
                {
                    "operation_id": str(uuid.uuid4()),
                    "operation_type": "record_sale",
                    "resource_id": kid,
                    "payload": {
                        "menu_item_id": str(uuid.uuid4()),  # does not exist
                        "sale_date": str(date.today()),
                        "portions_sold": 10,
                    },
                    "queued_at": "2026-11-01T10:00:00Z",
                    "client_status": "pending",
                }
            ],
        },
        headers=h,
    )
    assert r.status_code == 200
    result = r.json()["results"][0]
    assert result["status"] == "failed"
    assert result["error_code"] == "NOT_FOUND"


async def test_sync_wrong_kitchen_returns_403(
    client: AsyncClient, monkeypatch
) -> None:
    tokens_a = await _auth(client, monkeypatch, "+250780003004")
    tokens_b = await _auth(client, monkeypatch, "+250780003005")

    kitchen_b = (
        await client.post(
            "/api/v1/kitchens",
            json={"name": "B Kitchen", "currency": "RWF", "timezone": "Africa/Kigali"},
            headers=_h(tokens_b),
        )
    ).json()

    # Chef A tries to sync mutations against chef B's kitchen
    r = await client.post(
        "/api/v1/sync",
        json={
            "kitchen_id": kitchen_b["id"],
            "mutations": [
                {
                    "operation_id": str(uuid.uuid4()),
                    "operation_type": "record_sale",
                    "resource_id": kitchen_b["id"],
                    "payload": {
                        "menu_item_id": str(uuid.uuid4()),
                        "sale_date": str(date.today()),
                        "portions_sold": 5,
                    },
                    "queued_at": "2026-11-01T11:00:00Z",
                    "client_status": "pending",
                }
            ],
        },
        headers=_h(tokens_a),
    )
    assert r.status_code == 403
