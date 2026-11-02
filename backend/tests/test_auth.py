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
    """MOCK_OTP_CODE is set to '123456' via env override in this test."""
    import app.core.config as cfg

    monkeypatch.setattr(cfg.settings, "MOCK_OTP_CODE", "123456")

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
    import app.core.config as cfg

    monkeypatch.setattr(cfg.settings, "MOCK_OTP_CODE", "999999")
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
    import app.core.config as cfg

    monkeypatch.setattr(cfg.settings, "MOCK_OTP_CODE", "111111")
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
