from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.modules.authentication.dependencies import get_current_chef
from app.modules.chefs.models import Chef
from app.modules.exchange_rates.schemas import RateLookupResponse, RateOut
from app.modules.exchange_rates.service import ExchangeRateService, currency_code
from app.modules.kitchens.service import KitchenService
from app.shared.kitchen_time import kitchen_today

router = APIRouter(prefix="/kitchens/{kitchen_id}/exchange-rates", tags=["exchange-rates"])


@router.get("", response_model=RateLookupResponse)
async def get_rate(
    kitchen_id: uuid.UUID,
    base: str = Query(..., min_length=3, max_length=3),
    quote: str | None = Query(None, min_length=3, max_length=3),
    current_chef: Chef = Depends(get_current_chef),
    db: AsyncSession = Depends(get_db),
) -> RateLookupResponse:
    """The rate the app would use today (kitchen's local date). `quote` defaults to the
    kitchen's currency. `available: false` means "rate unavailable"."""
    kitchen = await KitchenService(db).get_kitchen(current_chef, kitchen_id)
    base_code = currency_code(base)
    quote_code = currency_code(quote) if quote else str(kitchen.currency)
    on_date = kitchen_today(kitchen)
    rate = await ExchangeRateService(db).find_rate(base_code, quote_code, on_date)
    return RateLookupResponse(
        available=rate is not None,
        base=base_code,
        quote=quote_code,
        on_date=on_date,
        max_age_days=settings.RATE_STALE_DAYS,
        rate=RateOut.of(rate),
    )
