from __future__ import annotations

from fastapi import APIRouter

from app.modules.authentication.router import router as auth_router
from app.modules.kitchens.router import router as kitchens_router

router = APIRouter(prefix="/v1")
router.include_router(auth_router)
router.include_router(kitchens_router)
