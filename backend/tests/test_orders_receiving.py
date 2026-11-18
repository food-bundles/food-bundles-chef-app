"""Orders (draft/submit) and delivery receiving tests (BE022, BE025-BE028)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

_PHONE_COUNTER = 9000


def _next_phone() -> str:
    global _PHONE_COUNTER
    _PHONE_COUNTER += 1
    return f"+2507800{_PHONE_COUNTER:05d}"


async def _get_tokens(client: AsyncClient, monkeypatch, phone: str) -> dict:
    monkeypatch.setattr(
        "app.modules.authentication.service.generate_otp", lambda: "777777"
    )  # pin the random OTP for the test
    await client.post("/api/v1/auth/otp/request", json={"phone_number": phone})
    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"phone_number": phone, "code": "777777"},
    )
    assert resp.status_code == 200
    return resp.json()


def _auth(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def _setup_kitchen(client: AsyncClient, tokens: dict) -> str:
    resp = await client.post(
        "/api/v1/kitchens",
        json={"name": "Test Kitchen", "currency": "RWF", "timezone": "Africa/Kigali"},
        headers=_auth(tokens),
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def _order_payload(ingredient_id: str | None = None) -> dict:
    return {
        "delivery_date": "2026-11-10",
        "notes": "Test order",
        "lines": [
            {
                "catalog_product_id": "FB-TOMATO-1KG",
                "product_name": "Tomatoes 1kg",
                "unit": "kg",
                "quantity_ordered": "10.000",
                "unit_price": "1500.00",
                "ingredient_id": ingredient_id,
            }
        ],
    }


# ---------------------------------------------------------------------------
# Order creation (BE022)
# ---------------------------------------------------------------------------


async def test_create_order_starts_confirmed(client: AsyncClient, monkeypatch) -> None:
    """Orders are created CONFIRMED (no separate submit step since ce8fc4f)."""
    tokens = await _get_tokens(client, monkeypatch, _next_phone())
    kitchen_id = await _setup_kitchen(client, tokens)

    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders",
        json=_order_payload(),
        headers=_auth(tokens),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "confirmed"
    assert len(body["lines"]) == 1
    assert body["lines"][0]["product_name"] == "Tomatoes 1kg"
    assert body["kitchen_id"] == kitchen_id


async def test_list_orders_empty(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, _next_phone())
    kitchen_id = await _setup_kitchen(client, tokens)

    resp = await client.get(
        f"/api/v1/kitchens/{kitchen_id}/orders",
        headers=_auth(tokens),
    )
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_orders_shows_created(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, _next_phone())
    kitchen_id = await _setup_kitchen(client, tokens)

    await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders",
        json=_order_payload(),
        headers=_auth(tokens),
    )
    resp = await client.get(
        f"/api/v1/kitchens/{kitchen_id}/orders",
        headers=_auth(tokens),
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1


async def test_get_order(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, _next_phone())
    kitchen_id = await _setup_kitchen(client, tokens)

    create_resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders",
        json=_order_payload(),
        headers=_auth(tokens),
    )
    order_id = create_resp.json()["id"]

    resp = await client.get(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}",
        headers=_auth(tokens),
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == order_id


async def test_submit_confirmed_order_returns_conflict(client: AsyncClient, monkeypatch) -> None:
    """A new order is already CONFIRMED, so submit is a conflict, not a status change."""
    tokens = await _get_tokens(client, monkeypatch, _next_phone())
    kitchen_id = await _setup_kitchen(client, tokens)

    create_resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders",
        json=_order_payload(),
        headers=_auth(tokens),
    )
    order_id = create_resp.json()["id"]

    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}/submit",
        headers=_auth(tokens),
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "CONFLICT"


async def test_submit_order_twice_returns_conflict(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, _next_phone())
    kitchen_id = await _setup_kitchen(client, tokens)

    create_resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders",
        json=_order_payload(),
        headers=_auth(tokens),
    )
    order_id = create_resp.json()["id"]

    await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}/submit",
        headers=_auth(tokens),
    )
    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}/submit",
        headers=_auth(tokens),
    )
    assert resp.status_code == 409


async def test_order_requires_at_least_one_line(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, _next_phone())
    kitchen_id = await _setup_kitchen(client, tokens)

    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders",
        json={"delivery_date": "2026-11-10", "lines": []},
        headers=_auth(tokens),
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Receiving (BE025-BE028)
# ---------------------------------------------------------------------------


async def _create_confirmed_order(
    client: AsyncClient, tokens: dict, kitchen_id: str, ingredient_id: str | None = None
) -> str:
    """Create an order and manually advance it to CONFIRMED status via submit.

    The orders service only exposes submit (DRAFT→SUBMITTED). For receiving tests
    we need CONFIRMED or OUT_FOR_DELIVERY. Since we have no webhook/admin endpoint
    yet, we patch the status directly via the service layer in unit tests instead.
    Here we'll test the receiving endpoint by checking that it rejects non-eligible
    statuses, and for the acceptance tests we'll create a helper that bypasses the
    status constraint via direct DB manipulation through the conftest session.
    """
    create_resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders",
        json=_order_payload(ingredient_id),
        headers=_auth(tokens),
    )
    assert create_resp.status_code == 201
    return create_resp.json()["id"]


async def test_receive_delivery_requires_confirmed_status(client: AsyncClient, monkeypatch) -> None:
    """Receiving needs a CONFIRMED/OUT_FOR_DELIVERY order: a DELIVERED one is a 409.

    Orders are created CONFIRMED (ce8fc4f), so the first receipt succeeds and moves the
    order to DELIVERED; receiving it again must be rejected.
    """
    tokens = await _get_tokens(client, monkeypatch, _next_phone())
    kitchen_id = await _setup_kitchen(client, tokens)
    order_id = await _create_confirmed_order(client, tokens, kitchen_id)

    # Get the order lines
    order_resp = await client.get(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}",
        headers=_auth(tokens),
    )
    line_id = order_resp.json()["lines"][0]["id"]

    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}/receiving",
        json={
            "lines": [
                {
                    "order_line_id": line_id,
                    "quantity_received": "10.000",
                    "decision": "accepted",
                }
            ]
        },
        headers=_auth(tokens),
    )
    assert resp.status_code == 201, resp.text

    again = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}/receiving",
        json={
            "lines": [
                {
                    "order_line_id": line_id,
                    "quantity_received": "10.000",
                    "decision": "accepted",
                }
            ]
        },
        headers=_auth(tokens),
    )
    assert again.status_code == 409


async def test_receive_delivery_wrong_kitchen_returns_404(client: AsyncClient, monkeypatch) -> None:
    """Chef B cannot receive Chef A's order."""
    tokens_a = await _get_tokens(client, monkeypatch, _next_phone())
    tokens_b = await _get_tokens(client, monkeypatch, _next_phone())
    kitchen_a = await _setup_kitchen(client, tokens_a)
    kitchen_b = await _setup_kitchen(client, tokens_b)

    order_id = await _create_confirmed_order(client, tokens_a, kitchen_a)
    order_resp = await client.get(
        f"/api/v1/kitchens/{kitchen_a}/orders/{order_id}",
        headers=_auth(tokens_a),
    )
    line_id = order_resp.json()["lines"][0]["id"]

    # Chef B tries to receive on their own kitchen but with Chef A's order ID
    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_b}/orders/{order_id}/receiving",
        json={
            "lines": [
                {
                    "order_line_id": line_id,
                    "quantity_received": "10.000",
                    "decision": "accepted",
                }
            ]
        },
        headers=_auth(tokens_b),
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Short delivery calculation unit tests (BE028)
# ---------------------------------------------------------------------------


def test_short_delivery_threshold_logic() -> None:
    """_is_short_delivery flags when accepted < 95% of ordered."""
    from decimal import Decimal

    from app.modules.receiving.service import _is_short_delivery

    # Exactly on threshold: 95% received — NOT short
    assert not _is_short_delivery(Decimal("9.5"), Decimal("10"))
    # 94.9% received — IS short
    assert _is_short_delivery(Decimal("9.49"), Decimal("10"))
    # Full delivery — not short
    assert not _is_short_delivery(Decimal("10"), Decimal("10"))
    # Overdelivery — not short
    assert not _is_short_delivery(Decimal("11"), Decimal("10"))
    # Zero ordered — not short (guard)
    assert not _is_short_delivery(Decimal("0"), Decimal("0"))
    # Complete rejection — is short (0 accepted vs 10 ordered = 100% shortfall)
    assert _is_short_delivery(Decimal("0"), Decimal("10"))


def test_accepted_quantity_rejected_returns_zero() -> None:
    from decimal import Decimal

    from app.modules.receiving.service import _accepted_quantity
    from app.shared.enums import ReceivingDecision

    assert _accepted_quantity(Decimal("5"), ReceivingDecision.REJECTED) == Decimal("0")
    assert _accepted_quantity(Decimal("5"), ReceivingDecision.ACCEPTED) == Decimal("5")
    assert _accepted_quantity(Decimal("3"), ReceivingDecision.PARTIALLY_ACCEPTED) == Decimal("3")


# ---------------------------------------------------------------------------
# Cancellation: allowed until the order is on its way
# ---------------------------------------------------------------------------


async def test_cancel_confirmed_order_succeeds(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, _next_phone())
    kitchen_id = await _setup_kitchen(client, tokens)
    order_id = await _create_confirmed_order(client, tokens, kitchen_id)

    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}/cancel", headers=_auth(tokens)
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "cancelled"


async def test_cancel_blocked_once_order_is_on_its_way(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, _next_phone())
    kitchen_id = await _setup_kitchen(client, tokens)
    order_id = await _create_confirmed_order(client, tokens, kitchen_id)
    start = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}/receiving/start", headers=_auth(tokens)
    )
    assert start.status_code == 200, start.text
    assert start.json()["status"] == "out_for_delivery"

    resp = await client.post(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}/cancel", headers=_auth(tokens)
    )
    assert resp.status_code == 409
    error = resp.json()["error"]
    assert error["code"] == "ORDER_ON_ITS_WAY"
    assert "on its way" in error["message"]
    detail = await client.get(
        f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}", headers=_auth(tokens)
    )
    assert detail.json()["status"] == "out_for_delivery"  # unchanged


async def test_cancel_cancelled_order_is_a_plain_conflict(client: AsyncClient, monkeypatch) -> None:
    tokens = await _get_tokens(client, monkeypatch, _next_phone())
    kitchen_id = await _setup_kitchen(client, tokens)
    order_id = await _create_confirmed_order(client, tokens, kitchen_id)
    url = f"/api/v1/kitchens/{kitchen_id}/orders/{order_id}/cancel"
    assert (await client.post(url, headers=_auth(tokens))).status_code == 200
    again = await client.post(url, headers=_auth(tokens))
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "CONFLICT"
