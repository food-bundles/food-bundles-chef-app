"""Kitchen CRUD and ownership isolation tests."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def _get_tokens(client: AsyncClient, monkeypatch, phone: str) -> dict:
    import app.core.config as cfg

    monkeypatch.setattr(cfg.settings, "MOCK_OTP_CODE", "222222")
    await client.post("/api/v1/auth/otp/request", json={"phone_number": phone})
    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"phone_number": phone, "code": "222222"},
    )
    assert resp.status_code == 200
    return resp.json()


def _auth(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def test_list_kitchens_empty(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, "+250780001001")
    resp = await client.get("/api/v1/kitchens", headers=_auth(tokens))
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_kitchen(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, "+250780001002")
    resp = await client.post(
        "/api/v1/kitchens",
        json={"name": "Mama's Kitchen", "currency": "RWF", "timezone": "Africa/Kigali"},
        headers=_auth(tokens),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Mama's Kitchen"
    assert body["currency"] == "RWF"
    assert "id" in body


async def test_get_kitchen(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, "+250780001003")
    create_resp = await client.post(
        "/api/v1/kitchens",
        json={"name": "Kigali Bites", "currency": "RWF", "timezone": "Africa/Kigali"},
        headers=_auth(tokens),
    )
    kitchen_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/kitchens/{kitchen_id}", headers=_auth(tokens))
    assert resp.status_code == 200
    assert resp.json()["id"] == kitchen_id


async def test_update_kitchen(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, "+250780001004")
    create_resp = await client.post(
        "/api/v1/kitchens",
        json={"name": "Old Name", "currency": "RWF", "timezone": "Africa/Kigali"},
        headers=_auth(tokens),
    )
    kitchen_id = create_resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/kitchens/{kitchen_id}",
        json={"name": "New Name"},
        headers=_auth(tokens),
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


async def test_archive_kitchen(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, "+250780001005")
    create_resp = await client.post(
        "/api/v1/kitchens",
        json={"name": "To Archive", "currency": "RWF", "timezone": "Africa/Kigali"},
        headers=_auth(tokens),
    )
    kitchen_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/v1/kitchens/{kitchen_id}", headers=_auth(tokens))
    assert resp.status_code == 204

    # Archived kitchen should no longer appear in list
    list_resp = await client.get("/api/v1/kitchens", headers=_auth(tokens))
    ids = [k["id"] for k in list_resp.json()]
    assert kitchen_id not in ids


async def test_kitchen_ownership_isolation(client: AsyncClient, monkeypatch) -> None:
    """Chef A cannot access Chef B's kitchen."""
    tokens_a = await _get_tokens(client, monkeypatch, "+250780001006")
    tokens_b = await _get_tokens(client, monkeypatch, "+250780001007")

    create_resp = await client.post(
        "/api/v1/kitchens",
        json={"name": "Chef B Kitchen", "currency": "RWF", "timezone": "Africa/Kigali"},
        headers=_auth(tokens_b),
    )
    kitchen_id = create_resp.json()["id"]

    # Chef A tries to GET chef B's kitchen
    resp = await client.get(f"/api/v1/kitchens/{kitchen_id}", headers=_auth(tokens_a))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "KITCHEN_ACCESS_DENIED"


async def test_kitchen_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/kitchens")
    assert resp.status_code == 401
