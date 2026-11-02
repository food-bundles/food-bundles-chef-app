from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.catalog.schemas import CatalogProductResponse
from app.modules.catalog.service import CatalogService

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/products", response_model=list[CatalogProductResponse])
async def list_catalog_products(
    category: str | None = Query(None, description="Filter by category name"),
    _chef=Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> list[CatalogProductResponse]:
    svc = CatalogService(db)
    return await svc.list_products(category)


@router.get("/products/{sku}", response_model=CatalogProductResponse)
async def get_catalog_product(
    sku: str,
    _chef=Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> CatalogProductResponse:
    from app.core.exceptions import NotFoundError

    svc = CatalogService(db)
    product = await svc.get_by_sku(sku)
    if product is None:
        raise NotFoundError(f"Catalog product '{sku}' not found.")
    return product
