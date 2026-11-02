from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/v1")

# Modules are registered here as they are implemented.
# from app.modules.authentication.router import router as auth_router
# router.include_router(auth_router, prefix="/auth", tags=["auth"])
