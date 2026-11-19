from __future__ import annotations

from datetime import date

from pydantic import BaseModel

from app.modules.exchange_rates.service import Rate


class RateOut(BaseModel):
    """1 `base` = `rate` `quote` (decimal string), published `rate_date` by `source`."""

    base: str
    quote: str
    rate: str
    rate_date: date
    source: str
    cross: bool

    @classmethod
    def of(cls, rate: Rate | None) -> RateOut | None:
        return None if rate is None else cls.model_validate(rate.to_api())


class RateLookupResponse(BaseModel):
    available: bool
    base: str
    quote: str
    # The kitchen's local date the rate is for, and how old a rate may be.
    on_date: date
    max_age_days: int
    rate: RateOut | None = None
