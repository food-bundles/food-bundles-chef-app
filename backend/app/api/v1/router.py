from __future__ import annotations

from fastapi import APIRouter

from app.modules.authentication.router import router as auth_router
from app.modules.ingredients.router import router as ingredients_router
from app.modules.inventory.router import router as inventory_router
from app.modules.kitchens.router import router as kitchens_router
from app.modules.menus.router import router as menus_router
from app.modules.orders.router import router as orders_router
from app.modules.purchasing.router import router as purchasing_router
from app.modules.receiving.router import router as receiving_router
from app.modules.recipes.router import router as recipes_router
from app.modules.sales.router import router as sales_router
from app.modules.synchronization.router import router as sync_router

router = APIRouter(prefix="/v1")
router.include_router(auth_router)
router.include_router(kitchens_router)
router.include_router(ingredients_router)
router.include_router(inventory_router)
router.include_router(menus_router)
router.include_router(recipes_router)
router.include_router(sales_router)
router.include_router(purchasing_router)
router.include_router(orders_router)
router.include_router(receiving_router)
router.include_router(sync_router)
