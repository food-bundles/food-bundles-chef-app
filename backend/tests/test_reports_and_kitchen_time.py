"""Step 2a review items A4 and A5.

A4: totals never add different currencies, including after a kitchen-currency change.
A5: "today", daily totals, stock days, scheduled jobs and the Assistant use the kitchen's
time zone; Europe/Paris (ahead of UTC) and America/Bogota (UTC-5, no DST) across midnight.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace

from app.core.security import create_access_token
from app.modules.ai.agent_service import _build_kitchen_context
from app.modules.chefs.models import Chef
from app.modules.exchange_rates.models import ExchangeRate
from app.modules.exchange_rates.providers import FetchedRate, RateFetch
from app.modules.exchange_rates.store import store_rates
from app.modules.kitchens.models import Kitchen
from app.modules.sales.service import SalesService
from app.shared.kitchen_time import kitchen_today
from app.workers.tasks.daily_reminders import kitchens_due
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

D = Decimal
_PHONE = [0]


async def _kitchen(
    client: AsyncClient, db: AsyncSession, currency: str, zone: str, country: str
) -> tuple[str, dict]:
    _PHONE[0] += 1
    chef = Chef(phone_number=f"+2507832{_PHONE[0]:05d}", name="Clock Chef")
    db.add(chef)
    await db.flush()
    headers = {"Authorization": f"Bearer {create_access_token(str(chef.id))}"}
    resp = await client.post(
        "/api/v1/kitchens",
        json={"name": "K", "currency": currency, "timezone": zone, "country": country},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"], headers


async def _item(client: AsyncClient, kid: str, headers: dict, name: str, price: str) -> str:
    menu = await client.post(f"/api/v1/kitchens/{kid}/menus", json={"name": "M"}, headers=headers)
    item = await client.post(
        f"/api/v1/kitchens/{kid}/menus/{menu.json()['id']}/items",
        json={"name": name, "selling_price": price},
        headers=headers,
    )
    assert item.status_code == 201, item.text
    return item.json()["id"]


async def _sell(
    client: AsyncClient, kid: str, headers: dict, item: str, day: date, portions: int
) -> None:
    resp = await client.post(
        f"/api/v1/kitchens/{kid}/sales",
        json={"menu_item_id": item, "sale_date": day.isoformat(), "portions_sold": portions},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text


# ── A4: per-currency totals across a currency change ──────────────────────────


async def test_daily_totals_never_add_currencies_after_a_currency_change(
    client: AsyncClient, db: AsyncSession
) -> None:
    await db.execute(delete(ExchangeRate))
    kid, headers = await _kitchen(client, db, "RWF", "Africa/Kigali", "RW")
    kitchen = await db.get(Kitchen, uuid.UUID(kid))
    assert kitchen is not None
    today = kitchen_today(kitchen)
    brochette = await _item(client, kid, headers, "Brochette", "3500")
    await _sell(client, kid, headers, brochette, today, 10)  # 35,000 RWF before the change

    # Mid-day the kitchen converts to EUR at 1 RWF = 0.0006 EUR (Brochette becomes 2.10 EUR).
    await store_rates(
        db,
        RateFetch(
            "frankfurter",
            "USD",
            [
                FetchedRate("RWF", D("1500"), today - timedelta(days=1)),
                FetchedRate("EUR", D("0.9"), today - timedelta(days=1)),
            ],
        ),
    )
    url = f"/api/v1/kitchens/{kid}/currency-change"
    preview = (
        await client.post(
            f"{url}/preview", json={"to_currency": "EUR", "mode": "convert"}, headers=headers
        )
    ).json()
    done = await client.post(
        url,
        json={
            "to_currency": "EUR",
            "mode": "convert",
            "rate": preview["rate"]["rate"],
            "rate_date": preview["rate"]["rate_date"],
        },
        headers=headers,
    )
    assert done.status_code == 200, done.text

    salad = await _item(client, kid, headers, "Salad", "5.00")
    await _sell(client, kid, headers, salad, today, 4)  # 20.00 EUR after the change

    summary = await client.get(
        f"/api/v1/kitchens/{kid}/sales/daily-summary",
        params={"date": today.isoformat()},
        headers=headers,
    )
    body = summary.json()
    assert body["mixed_currencies"] is True
    assert body["currency"] == "EUR"
    assert body["revenue_by_currency"] == [
        {"amount": "20.00", "currency": "EUR"},
        {"amount": "35000", "currency": "RWF"},
    ]
    assert D(body["revenue"]) == D("20.00")  # the EUR subtotal only, nothing added across
    assert body["portions"] == 14

    await db.refresh(kitchen)
    context, _ = await _build_kitchen_context(kitchen, db)
    line = next(ln for ln in context.splitlines() if ln.startswith("Revenue today"))
    assert "do not add them together" in line
    assert "20.00 EUR" in line
    assert "35000 RWF" in line


async def test_single_currency_day_has_one_subtotal_with_its_decimals(
    client: AsyncClient, db: AsyncSession
) -> None:
    kid, headers = await _kitchen(client, db, "EUR", "Europe/Paris", "FR")
    kitchen = await db.get(Kitchen, uuid.UUID(kid))
    assert kitchen is not None
    croque = await _item(client, kid, headers, "Croque", "7.99")
    await _sell(client, kid, headers, croque, kitchen_today(kitchen), 3)
    body = (
        await client.get(
            f"/api/v1/kitchens/{kid}/sales/daily-summary",
            params={"date": kitchen_today(kitchen).isoformat()},
            headers=headers,
        )
    ).json()
    # 23.97, not rounded to a whole number as before.
    assert body["revenue_by_currency"] == [{"amount": "23.97", "currency": "EUR"}]
    assert body["mixed_currencies"] is False
    assert D(body["revenue"]) == D("23.97")


# ── A5: the kitchen's clock across midnight ───────────────────────────────────

# 23:30 UTC on 19 Nov: already 00:30 on 20 Nov in Paris (UTC+1).
PARIS_NOW = datetime(2026, 11, 19, 23, 30, tzinfo=UTC)
# 03:00 UTC on 20 Nov: still 22:00 on 19 Nov in Bogota (UTC-5).
BOGOTA_NOW = datetime(2026, 11, 20, 3, 0, tzinfo=UTC)


def test_today_is_the_kitchens_calendar_day() -> None:
    assert kitchen_today("Europe/Paris", PARIS_NOW) == date(2026, 11, 20)
    assert kitchen_today("America/Bogota", BOGOTA_NOW) == date(2026, 11, 19)
    assert kitchen_today("Africa/Kigali", BOGOTA_NOW) == date(2026, 11, 20)


def test_scheduled_reminders_fire_at_each_kitchens_local_hour() -> None:
    paris = SimpleNamespace(timezone="Europe/Paris")
    bogota = SimpleNamespace(timezone="America/Bogota")
    kigali = SimpleNamespace(timezone="Africa/Kigali")
    kitchens = [paris, bogota, kigali]
    assert kitchens_due(kitchens, datetime(2026, 11, 20, 6, 0, tzinfo=UTC), 7) == [paris]
    assert kitchens_due(kitchens, datetime(2026, 11, 20, 12, 0, tzinfo=UTC), 7) == [bogota]
    assert kitchens_due(kitchens, datetime(2026, 11, 20, 5, 0, tzinfo=UTC), 7) == [kigali]


async def _assistant_sold_today(db: AsyncSession, kid: str, now: datetime) -> str:
    kitchen = await db.get(Kitchen, uuid.UUID(kid))
    assert kitchen is not None
    context, _ = await _build_kitchen_context(kitchen, db, now=now)
    return next(ln for ln in context.splitlines() if "| Dish |" in ln)


async def test_paris_assistant_and_daily_total_after_midnight(
    client: AsyncClient, db: AsyncSession
) -> None:
    kid, headers = await _kitchen(client, db, "EUR", "Europe/Paris", "FR")
    item = await _item(client, kid, headers, "Dish", "10.00")
    await _sell(client, kid, headers, item, date(2026, 11, 20), 6)  # Paris "today"
    await _sell(client, kid, headers, item, date(2026, 11, 19), 2)  # UTC "today"
    assert (await _assistant_sold_today(db, kid, PARIS_NOW)).rstrip().endswith("| 6")

    total = await client.get(
        f"/api/v1/kitchens/{kid}/sales/daily-summary",
        params={"date": "2026-11-20"},
        headers=headers,
    )
    assert total.json()["revenue_by_currency"] == [{"amount": "60.00", "currency": "EUR"}]


async def test_bogota_assistant_before_local_midnight(
    client: AsyncClient, db: AsyncSession
) -> None:
    kid, headers = await _kitchen(client, db, "COP", "America/Bogota", "CO")
    item = await _item(client, kid, headers, "Dish", "18000")
    await _sell(client, kid, headers, item, date(2026, 11, 19), 5)  # Bogota "today"
    await _sell(client, kid, headers, item, date(2026, 11, 20), 9)  # UTC "today"
    assert (await _assistant_sold_today(db, kid, BOGOTA_NOW)).rstrip().endswith("| 5")


async def test_weekly_demand_and_stock_days_use_the_kitchens_date(
    client: AsyncClient, db: AsyncSession
) -> None:
    """Demand (and so stock days and purchase suggestions) uses the last complete Monday-to-
    Sunday week before the KITCHEN's today. The week boundary is where midnight matters:
    - Bogota at 03:00 UTC Monday 23 Nov is still Sunday 22nd: latest week is 9-15 Nov
      (with the UTC date it would be 16-22).
    - Paris at 23:30 UTC Sunday 22 Nov is already Monday 23rd: latest week is 16-22 Nov
      (with the UTC date it would be 9-15)."""
    bogota_now = datetime(2026, 11, 23, 3, 0, tzinfo=UTC)
    paris_now = datetime(2026, 11, 22, 23, 30, tzinfo=UTC)

    kid, headers = await _kitchen(client, db, "COP", "America/Bogota", "CO")
    item = await _item(client, kid, headers, "Dish", "18000")
    await _sell(client, kid, headers, item, date(2026, 11, 10), 7)
    kitchen = await db.get(Kitchen, uuid.UUID(kid))
    assert kitchen is not None
    weeks = (
        await SalesService(db).get_weekly_summary(kitchen, uuid.UUID(item), now=bogota_now)
    ).weeks
    assert (weeks[0].week_start, weeks[0].total_portions) == (date(2026, 11, 9), 7)

    paris_id, paris_headers = await _kitchen(client, db, "EUR", "Europe/Paris", "FR")
    paris_item = await _item(client, paris_id, paris_headers, "Dish", "10.00")
    await _sell(client, paris_id, paris_headers, paris_item, date(2026, 11, 20), 4)
    paris = await db.get(Kitchen, uuid.UUID(paris_id))
    assert paris is not None
    weeks = (
        await SalesService(db).get_weekly_summary(paris, uuid.UUID(paris_item), now=paris_now)
    ).weeks
    assert (weeks[0].week_start, weeks[0].total_portions) == (date(2026, 11, 16), 4)

    # Purchasing (stock days) reads the same week: Paris's suggestion sees the demand.
    from app.modules.purchasing.service import PurchasingService

    suggestions = await PurchasingService(db).get_suggestions(paris, now=paris_now)
    assert suggestions.kitchen_id == paris.id
