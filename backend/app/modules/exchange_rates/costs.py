"""Ingredient unit costs in the kitchen's currency, for food cost (decision 4, 2026-11-19).

An ingredient keeps its cost in the currency it was entered in. Food cost converts it to the
kitchen's currency at the table's rate on the kitchen's local date, and shows that rate and
its date. Without a usable rate the cost is "rate unavailable", never a guessed number.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any, Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.exchange_rates.service import ExchangeRateService, Rate, apply_rate
from app.shared.kitchen_time import kitchen_today
from app.shared.money_fields import UNIT_COST_DECIMALS


class CostedIngredient(Protocol):
    id: Any
    cost_per_unit: Any
    cost_per_unit_currency: Any


@dataclass(frozen=True)
class UnitCost:
    """Cost per ingredient unit in the kitchen's currency."""

    amount: Decimal
    currency: str
    original_amount: Decimal
    original_currency: str
    rate: Rate | None  # None when the cost is already in the kitchen's currency


@dataclass
class KitchenUnitCosts:
    currency: str
    on_date: date
    costs: dict[uuid.UUID, UnitCost]
    rate_unavailable: set[uuid.UUID]

    def get(self, ingredient: CostedIngredient) -> UnitCost | None:
        return self.costs.get(ingredient.id)

    def is_rate_unavailable(self, ingredient: CostedIngredient) -> bool:
        return ingredient.id in self.rate_unavailable


async def kitchen_unit_costs(
    db: AsyncSession,
    kitchen: Any,
    ingredients: Iterable[CostedIngredient],
    on_date: date | None = None,
) -> KitchenUnitCosts:
    currency = str(kitchen.currency)
    day = on_date or kitchen_today(kitchen)
    rates = ExchangeRateService(db)
    result = KitchenUnitCosts(currency, day, {}, set())
    # Conversion off in this country (CURRENCY_CONVERSION_ENABLED_COUNTRIES): a cost kept in
    # another currency is never converted, so it counts as "rate unavailable".
    enabled = bool(getattr(kitchen, "conversion_enabled", True))
    for ing in ingredients:
        if ing.cost_per_unit is None:
            continue
        original = Decimal(ing.cost_per_unit)
        original_currency = str(ing.cost_per_unit_currency or currency)
        if original_currency == currency:
            result.costs[ing.id] = UnitCost(original, currency, original, currency, None)
            continue
        rate = await rates.find_rate(original_currency, currency, day) if enabled else None
        if rate is None:
            result.rate_unavailable.add(ing.id)
            continue
        converted = apply_rate(original, rate, places=UNIT_COST_DECIMALS)
        result.costs[ing.id] = UnitCost(
            converted.amount, currency, original, original_currency, rate
        )
    return result
