"""Authentication flow: OTP request → verify → JWT → refresh → logout."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_health(client: AsyncClient) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_otp_request_returns_200(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/auth/otp/request",
        json={"phone_number": "+250780000001"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "expires_in_seconds" in body
    assert body["expires_in_seconds"] > 0


async def test_otp_resend_cooldown(client: AsyncClient) -> None:
    phone = "+250780000002"
    await client.post("/api/v1/auth/otp/request", json={"phone_number": phone})
    resp = await client.post("/api/v1/auth/otp/request", json={"phone_number": phone})
    assert resp.status_code == 429
    assert resp.json()["error"]["code"] == "OTP_RESEND_COOLDOWN"


async def test_otp_verify_with_mock_code(client: AsyncClient, monkeypatch) -> None:
    """The random OTP generator is pinned to '123456' for this test."""

    monkeypatch.setattr(
        "app.modules.authentication.service.generate_otp", lambda: "123456"
    )  # pin the random OTP for the test

    phone = "+250780000003"
    await client.post("/api/v1/auth/otp/request", json={"phone_number": phone})

    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"phone_number": phone, "code": "123456"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


async def test_otp_verify_wrong_code(client: AsyncClient, monkeypatch) -> None:
    monkeypatch.setattr(
        "app.modules.authentication.service.generate_otp", lambda: "999999"
    )  # pin the random OTP for the test
    phone = "+250780000004"
    await client.post("/api/v1/auth/otp/request", json={"phone_number": phone})

    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"phone_number": phone, "code": "000000"},
    )
    assert resp.status_code == 400


async def test_get_me_unauthenticated(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def _authenticate(client: AsyncClient, monkeypatch, phone: str) -> dict:
    monkeypatch.setattr(
        "app.modules.authentication.service.generate_otp", lambda: "111111"
    )  # pin the random OTP for the test
    await client.post("/api/v1/auth/otp/request", json={"phone_number": phone})
    resp = await client.post(
        "/api/v1/auth/otp/verify",
        json={"phone_number": phone, "code": "111111"},
    )
    return resp.json()


async def test_get_me_authenticated(client: AsyncClient, monkeypatch) -> None:
    tokens = await _authenticate(client, monkeypatch, "+250780000005")
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["phone_number"] == "+250780000005"


async def test_refresh_token(client: AsyncClient, monkeypatch) -> None:
    tokens = await _authenticate(client, monkeypatch, "+250780000006")
    resp = await client.post(
        "/api/v1/auth/token/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert resp.status_code == 200
    new_tokens = resp.json()
    assert "access_token" in new_tokens
    # Old refresh token is revoked — second use must fail
    resp2 = await client.post(
        "/api/v1/auth/token/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert resp2.status_code == 401


async def test_logout(client: AsyncClient, monkeypatch) -> None:
    tokens = await _authenticate(client, monkeypatch, "+250780000007")
    resp = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert resp.status_code == 200
    # After logout refresh token must be invalid
    resp2 = await client.post(
        "/api/v1/auth/token/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert resp2.status_code == 401


async def test_update_profile_with_country_tin(client: AsyncClient, monkeypatch) -> None:
    """Test that new country/tin/restaurant fields can be updated."""
    tokens = await _authenticate(client, monkeypatch, "+250780000008")
    resp = await client.patch(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        json={
            "name": "Test Chef",
            "country": "RW",
            "tin": "123456789",
            "restaurant_id": "rest123",
            "restaurant_name": "Test Restaurant",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Test Chef"
    assert body["country"] == "RW"
    assert body["tin"] == "123456789"
    assert body["restaurant_id"] == "rest123"
    assert body["restaurant_name"] == "Test Restaurant"


async def test_profile_country_validation(client: AsyncClient, monkeypatch) -> None:
    """Test that country must be 2 characters if provided."""
    tokens = await _authenticate(client, monkeypatch, "+250780000009")
    resp = await client.patch(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        json={"country": "USA"},
    )
    assert resp.status_code == 422  # Validation error


async def test_update_profile_with_onboarding_completed(client: AsyncClient, monkeypatch) -> None:
    """Test that onboarding_completed_at can be set via profile update."""
    from datetime import UTC, datetime

    tokens = await _authenticate(client, monkeypatch, "+250780000010")

    # Initially null
    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["onboarding_completed_at"] is None

    # Set onboarding complete
    now = datetime.now(UTC)
    resp = await client.patch(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        json={"onboarding_completed_at": now.isoformat()},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["onboarding_completed_at"] is not None
