"""Phase 9: each kitchen has opening and closing times (Home's state is calculated from them)."""

from __future__ import annotations

import pytest
from app.core.security import create_access_token
from app.modules.chefs.models import Chef
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

_PHONE = [0]


async def _headers(db: AsyncSession) -> dict:
    _PHONE[0] += 1
    chef = Chef(phone_number=f"+2507830{_PHONE[0]:05d}", name="Hours Chef")
    db.add(chef)
    await db.flush()
    return {"Authorization": f"Bearer {create_access_token(str(chef.id))}"}


def _body(**fields: str) -> dict:
    return {
        "name": "Food Court",
        "currency": "RWF",
        "timezone": "Africa/Kigali",
        "country": "RW",
        **fields,
    }


async def test_new_kitchen_defaults_to_the_spec_hours(
    client: AsyncClient, db: AsyncSession
) -> None:
    headers = await _headers(db)
    resp = await client.post("/api/v1/kitchens", json=_body(), headers=headers)
    assert resp.status_code == 201, resp.text
    assert resp.json()["opening_time"] == "11:00:00"
    assert resp.json()["closing_time"] == "22:00:00"


async def test_kitchen_is_created_with_its_own_hours(client: AsyncClient, db: AsyncSession) -> None:
    headers = await _headers(db)
    resp = await client.post(
        "/api/v1/kitchens",
        json=_body(opening_time="06:30", closing_time="15:00"),
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    assert (resp.json()["opening_time"], resp.json()["closing_time"]) == ("06:30:00", "15:00:00")


async def test_closing_before_opening_is_rejected(client: AsyncClient, db: AsyncSession) -> None:
    headers = await _headers(db)
    resp = await client.post(
        "/api/v1/kitchens",
        json=_body(opening_time="22:00", closing_time="11:00"),
        headers=headers,
    )
    assert resp.status_code == 422


async def test_hours_are_updated_one_side_at_a_time(client: AsyncClient, db: AsyncSession) -> None:
    headers = await _headers(db)
    kitchen = (await client.post("/api/v1/kitchens", json=_body(), headers=headers)).json()
    url = f"/api/v1/kitchens/{kitchen['id']}"

    resp = await client.patch(url, json={"closing_time": "23:30"}, headers=headers)
    assert resp.status_code == 200, resp.text
    assert (resp.json()["opening_time"], resp.json()["closing_time"]) == ("11:00:00", "23:30:00")

    # Opening after the stored closing time is refused and nothing changes.
    resp = await client.patch(url, json={"opening_time": "23:45"}, headers=headers)
    assert resp.status_code == 422
    resp = await client.get(url, headers=headers)
    assert resp.json()["opening_time"] == "11:00:00"
