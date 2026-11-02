"""Rate limiting via slowapi (limits library backend).

Key rates applied:
  - OTP request  : 5 / 15 minutes per IP  (brute-force / SIM-swap protection)
  - OTP verify   : 10 / 15 minutes per IP
  - Auth endpoints: 30 / minute per IP
  - General API  : 200 / minute per authenticated user (keyed on JWT sub)
  - Health checks: exempt (no limiter decorator applied)
"""
from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _get_key(request: Request) -> str:
    """Key by authenticated chef ID when available, otherwise by IP."""
    # JWT sub is bound to structlog context as "chef_id" after auth dependency runs.
    # For pre-auth endpoints (OTP) fall back to IP.
    chef_id: str | None = getattr(request.state, "chef_id", None)
    if chef_id:
        return f"chef:{chef_id}"
    return get_remote_address(request)


limiter = Limiter(key_func=_get_key, default_limits=["200/minute"])

# Stricter limits for OTP endpoints — import and apply in the auth router
OTP_REQUEST_LIMIT = "5/15minutes"
OTP_VERIFY_LIMIT = "10/15minutes"
AUTH_LIMIT = "30/minute"
