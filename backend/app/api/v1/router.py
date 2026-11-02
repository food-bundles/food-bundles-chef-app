from __future__ import annotations

from fastapi import APIRouter

from app.modules.authentication.router import router as auth_router
from app.modules.ingredients.router import router as ingredients_router
from app.modules.inventory.router import router as inventory_router
from app.modules.kitchens.router import router as kitchens_router
from app.modules.menus.router import router as menus_router
from app.modules.recipes.router import router as recipes_router

router = APIRouter(prefix="/v1")
router.include_router(auth_router)
router.include_router(kitchens_router)
router.include_router(ingredients_router)
router.include_router(inventory_router)
router.include_router(menus_router)
router.include_router(recipes_router)
