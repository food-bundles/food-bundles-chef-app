"""Changing a kitchen's currency (Step 2a decision 3, 2026-11-19).

Two ways, both previewed first and both written to the audit log (who, when, how):

- **convert**: every menu price and every ingredient cost in the old currency is multiplied
  by ONE rate from the rates table (shown with its date). The chef confirms the rate the
  preview showed; if the table has a different rate by then, nothing changes (RATE_CHANGED).
- **relabel**: "my prices were entered in the wrong currency". Amounts stay the same and
  only the currency changes. Needs the new code typed as confirmation, and is refused when
  an amount would need rounding (7.99 relabelled as RWF, which has no cents).

Past sales, orders, deliveries and stock records keep the currency they were recorded in.
Ingredient costs entered in a third currency keep it (they are converted for food cost).
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from decimal import Decimal, InvalidOperation

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    CurrencyConfirmationError,
    RateChangedError,
    RateUnavailableError,
    RelabelPrecisionError,
    ValidationError,
)
from app.modules.audit.models import AuditEvent
from app.modules.audit.service import AuditService
from app.modules.chefs.models import Chef
from app.modules.exchange_rates.schemas import RateOut
from app.modules.exchange_rates.service import ExchangeRateService, Rate, apply_rate
from app.modules.ingredients.models import Ingredient
from app.modules.inventory.models import InventoryEntry
from app.modules.kitchens.currency_schemas import (
    CurrencyChangeLogEntry,
    CurrencyChangePreviewRequest,
    CurrencyChangePreviewResponse,
    CurrencyChangeRequest,
    CurrencyChangeResponse,
    KitchenHistoryOut,
    PriceChangeOut,
)
from app.modules.kitchens.models import Kitchen
from app.modules.kitchens.schemas import KitchenResponse
from app.modules.menus.models import MenuItem
from app.modules.orders.models import Order
from app.modules.receiving.models import DeliveryReceiving
from app.modules.sales.models import DailySaleRecord
from app.shared.enums import AuditEventType
from app.shared.kitchen_time import kitchen_today
from app.shared.money import InexactAmountError, Money
from app.shared.money_fields import UNIT_COST_DECIMALS, set_price
from app.shared.schemas.money import MoneyOut

TOO_MANY_DECIMALS = "too_many_decimals"


def _money_out(amount: Decimal, currency: str) -> MoneyOut:
    return MoneyOut(amount=format(amount, "f"), currency=currency)


@dataclass
class _Plan:
    from_currency: str
    to_currency: str
    mode: str
    rate: Rate | None
    history: KitchenHistoryOut
    items: list[tuple[MenuItem, Decimal | None]] = field(default_factory=list)
    costs: list[tuple[Ingredient, Decimal | None]] = field(default_factory=list)
    prices: list[PriceChangeOut] = field(default_factory=list)

    @property
    def blocked_reason(self) -> str | None:
        if self.mode == "convert" and self.rate is None:
            return RateUnavailableError.error_code
        if any(p.problem for p in self.prices):
            return RelabelPrecisionError.error_code
        return None


class CurrencyChangeService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def preview(
        self, kitchen: Kitchen, data: CurrencyChangePreviewRequest
    ) -> CurrencyChangePreviewResponse:
        plan = await self._plan(kitchen, data)
        return CurrencyChangePreviewResponse(
            from_currency=plan.from_currency,
            to_currency=plan.to_currency,
            mode=data.mode,
            rate=RateOut.of(plan.rate),
            rate_unavailable=data.mode == "convert" and plan.rate is None,
            history=plan.history,
            prices=plan.prices,
            can_apply=plan.blocked_reason is None,
            blocked_reason=plan.blocked_reason,
            confirmation_text=plan.to_currency if data.mode == "relabel" else None,
            price_step_reset=kitchen.price_step is not None,
        )

    async def apply(
        self, kitchen: Kitchen, chef: Chef, data: CurrencyChangeRequest
    ) -> CurrencyChangeResponse:
        plan = await self._plan(kitchen, data)
        if data.mode == "relabel":
            if (data.confirmation or "").strip().upper() != plan.to_currency:
                raise CurrencyConfirmationError()
            if plan.blocked_reason:
                raise RelabelPrecisionError()
        else:
            if plan.rate is None:
                raise RateUnavailableError()
            if not _same_rate(plan.rate, data):
                raise RateChangedError()

        to = plan.to_currency
        for item, after in plan.items:
            if after is not None:
                set_price(item, "selling_price", after, to)
        for ing, cost in plan.costs:
            ing.cost_per_unit = cost
            ing.cost_per_unit_currency = to
        kitchen.currency = to
        kitchen.price_step = None
        await self._db.flush()

        await AuditService(self._db).record(
            AuditEventType.KITCHEN_CURRENCY_CHANGED,
            actor_id=chef.id,
            kitchen_id=kitchen.id,
            details={
                "from_currency": plan.from_currency,
                "to_currency": to,
                "mode": data.mode,
                "rate": plan.rate.to_api()["rate"] if plan.rate else None,
                "rate_date": plan.rate.rate_date.isoformat() if plan.rate else None,
                "rate_source": plan.rate.source if plan.rate else None,
                "menu_items_changed": len(plan.items),
                "ingredient_costs_changed": len(plan.costs),
                "had_history": plan.history.has_history,
            },
        )
        await self._db.refresh(kitchen)
        return CurrencyChangeResponse(
            kitchen=KitchenResponse.model_validate(kitchen),
            mode=data.mode,
            from_currency=plan.from_currency,
            to_currency=to,
            menu_items_changed=len(plan.items),
            ingredient_costs_changed=len(plan.costs),
            rate=RateOut.of(plan.rate),
        )

    async def log(self, kitchen: Kitchen) -> list[CurrencyChangeLogEntry]:
        rows = await self._db.execute(
            select(AuditEvent)
            .where(
                AuditEvent.kitchen_id == kitchen.id,
                AuditEvent.event_type == str(AuditEventType.KITCHEN_CURRENCY_CHANGED),
            )
            .order_by(AuditEvent.occurred_at.desc())
        )
        entries: list[CurrencyChangeLogEntry] = []
        for event in rows.scalars().all():
            details = json.loads(event.details) if event.details else {}
            entries.append(
                CurrencyChangeLogEntry(
                    changed_at=event.occurred_at,
                    changed_by=event.actor_id,
                    from_currency=details.get("from_currency"),
                    to_currency=details.get("to_currency"),
                    mode=details.get("mode"),
                    rate=details.get("rate"),
                    rate_date=details.get("rate_date"),
                )
            )
        return entries

    async def _plan(self, kitchen: Kitchen, data: CurrencyChangePreviewRequest) -> _Plan:
        from_currency = str(kitchen.currency)
        to = data.to_currency
        if to == from_currency:
            raise ValidationError(f"The kitchen already uses {to}.")
        rate: Rate | None = None
        if data.mode == "convert":
            rate = await ExchangeRateService(self._db).find_rate(
                from_currency, to, kitchen_today(kitchen)
            )
        plan = _Plan(from_currency, to, data.mode, rate, await self._history(kitchen.id))

        items = await self._db.execute(
            select(MenuItem).where(MenuItem.kitchen_id == kitchen.id).order_by(MenuItem.name)
        )
        for item in items.scalars().all():
            before = (
                Money(int(item.selling_price_minor), from_currency).amount
                if item.selling_price_minor is not None
                else Decimal(item.selling_price)
            )
            after, problem = self._new_price(before, to, rate, data.mode)
            plan.items.append((item, after))
            plan.prices.append(
                PriceChangeOut(
                    kind="menu_item",
                    id=item.id,
                    name=item.name,
                    before=_money_out(before, from_currency),
                    after=_money_out(after, to) if after is not None else None,
                    problem=problem,
                )
            )

        ingredients = await self._db.execute(
            select(Ingredient)
            .where(Ingredient.kitchen_id == kitchen.id, Ingredient.cost_per_unit.is_not(None))
            .order_by(Ingredient.name)
        )
        for ing in ingredients.scalars().all():
            # Costs entered in a third currency keep it; only the kitchen currency changes.
            if ing.cost_per_unit is None:
                continue
            if (ing.cost_per_unit_currency or from_currency) != from_currency:
                continue
            before = Decimal(ing.cost_per_unit)
            cost: Decimal | None = before
            if rate is not None:
                cost = apply_rate(before, rate, places=UNIT_COST_DECIMALS).amount
            elif data.mode == "convert":
                cost = None
            plan.costs.append((ing, cost))
            plan.prices.append(
                PriceChangeOut(
                    kind="ingredient_cost",
                    id=ing.id,
                    name=ing.name,
                    before=_money_out(before, from_currency),
                    after=_money_out(cost, to) if cost is not None else None,
                )
            )
        return plan

    @staticmethod
    def _new_price(
        before: Decimal, to: str, rate: Rate | None, mode: str
    ) -> tuple[Decimal | None, str | None]:
        if mode == "convert":
            if rate is None:
                return None, None
            # A computed amount: rounded to the new currency's smallest unit (half up).
            return Money.rounded(apply_rate(before, rate).amount, to).amount, None
        try:
            return Money.of(before, to).amount, None
        except InexactAmountError:
            return None, TOO_MANY_DECIMALS

    async def _history(self, kitchen_id: uuid.UUID) -> KitchenHistoryOut:
        async def count(model: type) -> int:
            result = await self._db.execute(
                select(func.count()).select_from(model).where(model.kitchen_id == kitchen_id)  # type: ignore[attr-defined]
            )
            return int(result.scalar_one())

        sales = await count(DailySaleRecord)
        orders = await count(Order)
        stock = await count(InventoryEntry)
        deliveries = await count(DeliveryReceiving)
        return KitchenHistoryOut(
            sales=sales,
            orders=orders,
            stock_entries=stock,
            deliveries=deliveries,
            has_history=any((sales, orders, stock, deliveries)),
        )


def _same_rate(rate: Rate, data: CurrencyChangeRequest) -> bool:
    if data.rate is None or data.rate_date is None:
        return False
    try:
        sent = Decimal(data.rate)
    except InvalidOperation:
        return False
    return sent == rate.rate and data.rate_date == rate.rate_date
