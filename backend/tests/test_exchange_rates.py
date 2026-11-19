"""Step 2a build step 3: exchange rates, convert(), staleness, ingredient costs in other
currencies, the currency-change flow, and the "AI never supplies a rate" guarantees."""

from __future__ import annotations

import re
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

import httpx
import pytest
from app.core.exceptions import RateUnavailableError
from app.core.security import create_access_token
from app.modules.ai.agent_service import _build_kitchen_context
from app.modules.ai.schemas import agent as agent_schemas
from app.modules.ai.schemas import gateway as gateway_schemas
from app.modules.chefs.models import Chef
from app.modules.exchange_rates.models import ExchangeRate
from app.modules.exchange_rates.providers import (
    SOURCE_EXCHANGERATE_API,
    SOURCE_FRANKFURTER,
    FetchedRate,
    RateFetch,
    RateProviderError,
    _get_json,
    parse_exchangerate_api,
    parse_frankfurter,
)
from app.modules.exchange_rates.service import ExchangeRateService
from app.modules.exchange_rates.store import refresh_rates, store_rates
from app.modules.kitchens.models import Kitchen
from httpx import AsyncClient
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

D = Decimal
_PHONE = [0]
# A fixed kitchen date far from today, so rows written by other tests never interfere.
DAY = date(2031, 3, 12)


@pytest.fixture(autouse=True)
async def _empty_rates(db: AsyncSession):
    await db.execute(delete(ExchangeRate))
    return


async def _seed(
    db: AsyncSession, day: date, rates: dict[str, str], source: str = SOURCE_FRANKFURTER
) -> None:
    fetch = RateFetch(source, "USD", [FetchedRate(q, D(r), day) for q, r in rates.items()])
    await store_rates(db, fetch)


# ── provider parsing (recorded payload shapes) ────────────────────────────────


def test_parse_exchangerate_api_success_and_errors() -> None:
    payload = {
        "result": "success",
        "time_last_update_unix": 1795305601,  # 2026-11-22 00:00:01 UTC
        "base_code": "USD",
        "conversion_rates": {
            "USD": 1,
            "RWF": D("1477.34"),
            "EUR": D("0.9094"),
            "ZZZ": 3,
            "NGN": -1,
        },
    }
    fetch = parse_exchangerate_api(payload)
    assert fetch.source == SOURCE_EXCHANGERATE_API
    got = {r.quote: r for r in fetch.rates}
    assert set(got) == {"RWF", "EUR"}  # USD itself, unknown codes and bad rates dropped
    assert got["RWF"].rate == D("1477.34")
    assert got["RWF"].rate_date == date(2026, 11, 22)
    assert got["RWF"].provider_timestamp is not None

    with pytest.raises(RateProviderError) as err:
        parse_exchangerate_api({"result": "error", "error-type": "invalid-key"})
    assert err.value.reason == "invalid-key"


def test_parse_frankfurter_keeps_each_pairs_own_date() -> None:
    payload = [
        {"date": "2026-11-19", "base": "USD", "quote": "EUR", "rate": D("0.90938")},
        {"date": "2026-11-18", "base": "USD", "quote": "RWF", "rate": D("1477.34")},
        {"date": "2026-11-18", "base": "EUR", "quote": "RWF", "rate": D("1600")},
    ]
    fetch = parse_frankfurter(payload)
    got = {r.quote: r.rate_date for r in fetch.rates}
    assert got == {"EUR": date(2026, 11, 19), "RWF": date(2026, 11, 18)}
    with pytest.raises(RateProviderError):
        parse_frankfurter({"rates": {}})


async def test_provider_errors_never_contain_the_url_or_key() -> None:
    marker = "KEYMARKER" * 2  # stands in for the key in the URL

    def boom(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError(f"cannot reach {request.url}", request=request)

    async with httpx.AsyncClient(transport=httpx.MockTransport(boom)) as client:
        with pytest.raises(RateProviderError) as err:
            await _get_json(
                client, SOURCE_EXCHANGERATE_API, f"https://x.test/v6/{marker}/latest/USD"
            )
    assert err.value.reason == "ConnectError"
    assert marker not in str(err.value)


async def test_refresh_uses_fallback_when_primary_fails(db: AsyncSession) -> None:
    async def primary(_client: httpx.AsyncClient) -> RateFetch:
        raise RateProviderError(SOURCE_EXCHANGERATE_API, "quota-reached")

    async def fallback(_client: httpx.AsyncClient) -> RateFetch:
        return RateFetch(SOURCE_FRANKFURTER, "USD", [FetchedRate("RWF", D("1477.34"), DAY)])

    async with httpx.AsyncClient() as client:
        stored = await refresh_rates(
            db,
            [(SOURCE_EXCHANGERATE_API, primary), (SOURCE_FRANKFURTER, fallback)],
            client=client,
        )
        assert stored == {SOURCE_FRANKFURTER: 1}
        rate = await ExchangeRateService(db).get_rate("USD", "RWF", DAY)
        assert (rate.rate, rate.source) == (D("1477.34"), SOURCE_FRANKFURTER)

        async def down(_client: httpx.AsyncClient) -> RateFetch:
            raise RateProviderError(SOURCE_FRANKFURTER, "http_503")

        assert await refresh_rates(db, [(SOURCE_FRANKFURTER, down)], client=client) == {}


async def test_store_upserts_same_day_pair_and_source(db: AsyncSession) -> None:
    await _seed(db, DAY, {"RWF": "1400"})
    await _seed(db, DAY, {"RWF": "1477.34"})
    rows = (await db.execute(select(ExchangeRate).where(ExchangeRate.quote == "RWF"))).scalars()
    assert [r.rate for r in rows] == [D("1477.34")]


# ── convert(): only the table, staleness, cross rates ─────────────────────────


async def test_empty_table_means_rate_unavailable(db: AsyncSession) -> None:
    """AI-never-supplies-a-rate test 1: with no stored rate there is no conversion at all."""
    svc = ExchangeRateService(db)
    with pytest.raises(RateUnavailableError):
        await svc.convert(D("10"), "USD", "RWF", DAY)
    assert await svc.find_rate("EUR", "RWF", DAY) is None


async def test_direct_inverse_and_cross_rates(db: AsyncSession) -> None:
    await _seed(db, DAY, {"RWF": "1477.34", "EUR": "0.9094"})
    svc = ExchangeRateService(db)

    usd_rwf = await svc.convert(D("7.99"), "USD", "RWF", DAY)
    assert (usd_rwf.amount, usd_rwf.currency) == (D("11804"), "RWF")  # 11803.95 → half up
    assert usd_rwf.rate.cross is False
    assert usd_rwf.rate.rate_date == DAY

    rwf_usd = await svc.get_rate("RWF", "USD", DAY)
    assert rwf_usd.rate == (D(1) / D("1477.34")).quantize(D("1e-12"))

    eur_rwf = await svc.convert(D("10"), "EUR", "RWF", DAY)
    assert eur_rwf.rate.cross is True
    assert eur_rwf.rate.rate == (D("1477.34") / D("0.9094")).quantize(D("1e-12"))
    assert eur_rwf.amount == D("16245")  # 10 x 1624.521…

    same = await svc.convert(D("3500"), "RWF", "rwf", DAY)
    assert same.amount == D("3500")
    assert same.rate.source == "identity"


async def test_staleness_window_is_three_days(db: AsyncSession) -> None:
    await _seed(db, DAY - timedelta(days=3), {"RWF": "1470"})
    svc = ExchangeRateService(db)
    rate = await svc.get_rate("USD", "RWF", DAY)
    assert rate.rate_date == DAY - timedelta(days=3)  # date is returned, to be shown

    assert await ExchangeRateService(db).find_rate("USD", "RWF", DAY + timedelta(days=1)) is None
    # A rate dated after the kitchen's day is never used.
    assert await ExchangeRateService(db).find_rate("USD", "RWF", DAY - timedelta(days=4)) is None


async def test_newest_day_wins_then_primary_source(db: AsyncSession) -> None:
    await _seed(db, DAY - timedelta(days=1), {"RWF": "1400"}, SOURCE_EXCHANGERATE_API)
    await _seed(db, DAY - timedelta(days=1), {"RWF": "1410"}, SOURCE_FRANKFURTER)
    rate = await ExchangeRateService(db).get_rate("USD", "RWF", DAY)
    assert (rate.rate, rate.source) == (D("1400"), SOURCE_EXCHANGERATE_API)

    await _seed(db, DAY, {"RWF": "1420"}, SOURCE_FRANKFURTER)
    rate = await ExchangeRateService(db).get_rate("USD", "RWF", DAY)
    assert (rate.rate, rate.source, rate.rate_date) == (D("1420"), SOURCE_FRANKFURTER, DAY)


async def test_cross_rate_legs_never_mix_sources(db: AsyncSession) -> None:
    await _seed(db, DAY, {"EUR": "0.9"}, SOURCE_EXCHANGERATE_API)
    await _seed(db, DAY, {"RWF": "1477"}, SOURCE_FRANKFURTER)
    assert await ExchangeRateService(db).find_rate("EUR", "RWF", DAY) is None


async def test_cross_rate_is_dated_by_its_older_leg(db: AsyncSession) -> None:
    """Seen live on 2026-11-19: Frankfurter had EUR (ECB) for the 19th, RWF (BNR) only for
    the 18th. The cross rate is usable and shown as the 18th's."""
    await _seed(db, DAY - timedelta(days=1), {"RWF": "1477.34", "EUR": "0.91174"})
    await _seed(db, DAY, {"EUR": "0.90938"})
    rate = await ExchangeRateService(db).get_rate("EUR", "RWF", DAY)
    assert rate.rate_date == DAY - timedelta(days=1)
    assert rate.rate == (D("1477.34") / D("0.90938")).quantize(D("1e-12"))  # newest EUR leg


# ── "AI never supplies a rate" guarantees ─────────────────────────────────────

_APP = Path(__file__).resolve().parents[1] / "app"
_WRITE_PATTERNS = [
    re.compile(r"\b(insert|update|delete)\(\s*ExchangeRate\b"),
    re.compile(r"(?<!class )\bExchangeRate\("),
    re.compile(r"(?i)\b(insert\s+into|update|delete\s+from)\s+exchange_rates\b"),
]


def test_only_the_rates_job_writes_exchange_rates() -> None:
    """AI-never-supplies-a-rate test 3 (architecture): one writer, store.py."""
    allowed = {_APP / "modules" / "exchange_rates" / "store.py"}
    offenders = []
    for path in _APP.rglob("*.py"):
        if path in allowed:
            continue
        text = path.read_text(encoding="utf-8")
        if any(p.search(text) for p in _WRITE_PATTERNS):
            offenders.append(str(path.relative_to(_APP)))
    assert offenders == []


def test_ai_output_schemas_carry_no_rate() -> None:
    """AI-never-supplies-a-rate test 2: no model output schema has a rate field, and a
    "rate" a model adds anyway is dropped on validation (step 5 makes them extra=forbid)."""
    models = [
        obj
        for module in (gateway_schemas, agent_schemas)
        for name, obj in vars(module).items()
        if name.startswith("Model") and isinstance(obj, type) and issubclass(obj, BaseModel)
    ]
    assert models
    for model in models:
        for field in model.model_fields:
            assert "rate" not in field.lower(), (model, field)
            assert "exchange" not in field.lower(), (model, field)

    parsed = gateway_schemas.ModelMenuItem.model_validate(
        {
            "name": "Burger",
            "price_text": "$5",
            "name_confidence": 0.9,
            "price_confidence": 0.9,
            "exchange_rate": 1000,
        }
    )
    assert "exchange_rate" not in parsed.model_dump()


# ── API: helpers ──────────────────────────────────────────────────────────────


async def _kitchen(
    client: AsyncClient, db: AsyncSession, currency: str, zone: str, country: str
) -> tuple[str, dict]:
    _PHONE[0] += 1
    chef = Chef(phone_number=f"+2507831{_PHONE[0]:05d}", name="Rates Chef")
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


def _today_utc() -> date:
    return datetime.now(UTC).date()


async def _menu_item(client: AsyncClient, kid: str, headers: dict, name: str, price: str) -> str:
    menu = await client.post(f"/api/v1/kitchens/{kid}/menus", json={"name": "M"}, headers=headers)
    item = await client.post(
        f"/api/v1/kitchens/{kid}/menus/{menu.json()['id']}/items",
        json={"name": name, "selling_price": price},
        headers=headers,
    )
    assert item.status_code == 201, item.text
    return item.json()["id"]


async def _ingredient(
    client: AsyncClient, kid: str, headers: dict, name: str, cost: str, currency: str | None
) -> str:
    body: dict = {"name": name, "unit": "kg", "cost_per_unit": cost}
    if currency:
        body["cost_per_unit_currency"] = currency
    resp = await client.post(f"/api/v1/kitchens/{kid}/ingredients", json=body, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


# ── API: rate lookup ──────────────────────────────────────────────────────────


async def test_rate_endpoint_shows_rate_and_date_or_unavailable(
    client: AsyncClient, db: AsyncSession
) -> None:
    kid, headers = await _kitchen(client, db, "RWF", "Africa/Kigali", "RW")
    url = f"/api/v1/kitchens/{kid}/exchange-rates"
    none = (await client.get(url, params={"base": "USD"}, headers=headers)).json()
    assert none["available"] is False
    assert none["rate"] is None
    assert none["max_age_days"] == 3

    await _seed(db, _today_utc() - timedelta(days=1), {"RWF": "1477.34"})
    body = (await client.get(url, params={"base": "usd"}, headers=headers)).json()
    assert body["available"] is True
    assert body["quote"] == "RWF"
    assert body["rate"]["rate"] == "1477.34"
    assert body["rate"]["rate_date"] == (_today_utc() - timedelta(days=1)).isoformat()

    bad = await client.get(url, params={"base": "ZZZ"}, headers=headers)
    assert bad.status_code == 422
    assert bad.json()["error"]["code"] == "UNKNOWN_CURRENCY"


# ── API: ingredient costs in another currency (decision 4) ────────────────────


async def test_food_cost_converts_foreign_ingredient_costs_with_rate_and_date(
    client: AsyncClient, db: AsyncSession
) -> None:
    kid, headers = await _kitchen(client, db, "RWF", "Africa/Kigali", "RW")
    item = await _menu_item(client, kid, headers, "Steak", "9000")
    beef = await _ingredient(client, kid, headers, "Beef", "8.00", "USD")  # imported, priced in USD
    salt = await _ingredient(client, kid, headers, "Salt", "500", None)  # kitchen currency
    recipe = f"/api/v1/kitchens/{kid}/menu-items/{item}/recipe"
    for ing in (beef, salt):
        line = await client.post(
            recipe,
            json={"ingredient_id": ing, "qty_per_portion": "0.25", "unit": "kg"},
            headers=headers,
        )
        assert line.status_code == 201, line.text

    # No rate yet: the USD line is "rate unavailable", never a guessed number.
    cost = (await client.get(f"{recipe}/cost", headers=headers)).json()
    beef_line = next(ln for ln in cost["lines"] if ln["ingredient_name"] == "Beef")
    assert beef_line["rate_unavailable"] is True
    assert beef_line["line_cost"] is None
    assert cost["complete"] is False
    assert D(cost["total_cost"]) == D("125.00")

    await _seed(db, _today_utc() - timedelta(days=1), {"RWF": "1477.34"})
    cost = (await client.get(f"{recipe}/cost", headers=headers)).json()
    beef_line = next(ln for ln in cost["lines"] if ln["ingredient_name"] == "Beef")
    assert (beef_line["cost_per_unit_currency"], D(beef_line["cost_per_unit"])) == ("USD", D("8"))
    assert D(beef_line["cost_per_unit_converted"]) == D("11818.72")
    assert beef_line["rate"]["rate"] == "1477.34"
    assert beef_line["rate"]["rate_date"]
    assert cost["complete"] is True
    assert cost["currency"] == "RWF"
    assert D(cost["total_cost"]) == D("2954.68") + D("125.00")

    ing = (await client.get(f"/api/v1/kitchens/{kid}/ingredients/{beef}", headers=headers)).json()
    assert ing["cost_per_unit_currency"] == "USD"  # the original is kept


async def test_assistant_context_gets_converted_costs_never_rates(
    client: AsyncClient, db: AsyncSession
) -> None:
    kid, headers = await _kitchen(client, db, "EUR", "Europe/Paris", "FR")
    await _ingredient(client, kid, headers, "Saffron", "2.00", "USD")
    await _seed(db, _today_utc() - timedelta(days=1), {"EUR": "0.8"})
    kitchen = await db.get(Kitchen, uuid.UUID(kid))
    context, _known = await _build_kitchen_context(kitchen, db)
    assert "cost per unit EUR" in context
    assert "| Saffron | kg | 1.6" in context
    assert "0.8" not in context.replace("1.6", "")  # the rate itself is never sent


# ── API: changing the kitchen currency (decision 3) ───────────────────────────


async def test_convert_previews_then_applies_the_stated_rate(
    client: AsyncClient, db: AsyncSession
) -> None:
    kid, headers = await _kitchen(client, db, "RWF", "Africa/Kigali", "RW")
    await _menu_item(client, kid, headers, "Brochette", "3500")
    await _ingredient(client, kid, headers, "Onion", "800", None)
    await _ingredient(client, kid, headers, "Olive oil", "12.50", "USD")  # third currency stays
    await client.patch(f"/api/v1/kitchens/{kid}", json={"price_step": "100"}, headers=headers)
    base = f"/api/v1/kitchens/{kid}/currency-change"

    unavailable = (
        await client.post(
            f"{base}/preview", json={"to_currency": "EUR", "mode": "convert"}, headers=headers
        )
    ).json()
    assert unavailable["rate_unavailable"] is True
    assert unavailable["can_apply"] is False
    refused = await client.post(
        base, json={"to_currency": "EUR", "mode": "convert"}, headers=headers
    )
    assert refused.status_code == 409
    assert refused.json()["error"]["code"] == "RATE_UNAVAILABLE"

    await _seed(db, _today_utc() - timedelta(days=1), {"RWF": "1500", "EUR": "0.9"})
    preview = (
        await client.post(
            f"{base}/preview", json={"to_currency": "eur", "mode": "convert"}, headers=headers
        )
    ).json()
    assert preview["can_apply"] is True
    assert preview["rate"]["cross"] is True
    assert preview["price_step_reset"] is True
    prices = {p["name"]: p for p in preview["prices"]}
    assert set(prices) == {"Brochette", "Onion"}
    assert prices["Brochette"]["before"] == {"amount": "3500", "currency": "RWF"}
    assert prices["Brochette"]["after"] == {"amount": "2.10", "currency": "EUR"}  # 3500 x 0.0006
    assert D(prices["Onion"]["after"]["amount"]) == D("0.48")

    stale = await client.post(
        base,
        json={
            "to_currency": "EUR",
            "mode": "convert",
            "rate": "0.0007",
            "rate_date": preview["rate"]["rate_date"],
        },
        headers=headers,
    )
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "RATE_CHANGED"
    assert (await client.get(f"/api/v1/kitchens/{kid}", headers=headers)).json()[
        "currency"
    ] == "RWF"

    done = await client.post(
        base,
        json={
            "to_currency": "EUR",
            "mode": "convert",
            "rate": preview["rate"]["rate"],
            "rate_date": preview["rate"]["rate_date"],
        },
        headers=headers,
    )
    assert done.status_code == 200, done.text
    body = done.json()
    assert body["kitchen"]["currency"] == "EUR"
    assert body["kitchen"]["price_step"] is None
    assert (body["menu_items_changed"], body["ingredient_costs_changed"]) == (1, 1)

    ings = (await client.get(f"/api/v1/kitchens/{kid}/ingredients", headers=headers)).json()
    by_name = {i["name"]: i for i in ings}
    assert by_name["Olive oil"]["cost_per_unit_currency"] == "USD"
    assert by_name["Onion"]["cost_per_unit_currency"] == "EUR"

    log = (await client.get(f"/api/v1/kitchens/{kid}/currency-changes", headers=headers)).json()
    assert len(log) == 1
    assert (log[0]["from_currency"], log[0]["to_currency"], log[0]["mode"]) == (
        "RWF",
        "EUR",
        "convert",
    )
    assert log[0]["changed_by"]
    assert log[0]["rate"] == preview["rate"]["rate"]


async def test_relabel_needs_typed_confirmation_and_never_rounds(
    client: AsyncClient, db: AsyncSession
) -> None:
    kid, headers = await _kitchen(client, db, "EUR", "Europe/Paris", "FR")
    await _menu_item(client, kid, headers, "Croque", "7.99")
    order = await client.post(
        f"/api/v1/kitchens/{kid}/orders",
        json={
            "lines": [
                {
                    "catalog_product_id": "manual",
                    "product_name": "Bread",
                    "unit": "pc",
                    "quantity_ordered": "10",
                    "unit_price": "0.50",
                }
            ]
        },
        headers=headers,
    )
    assert order.status_code == 201, order.text
    base = f"/api/v1/kitchens/{kid}/currency-change"

    # 7.99 cannot become RWF (no cents) without rounding: blocked, not rounded.
    to_rwf = (
        await client.post(
            f"{base}/preview", json={"to_currency": "RWF", "mode": "relabel"}, headers=headers
        )
    ).json()
    assert to_rwf["can_apply"] is False
    assert to_rwf["blocked_reason"] == "RELABEL_PRECISION"
    assert to_rwf["prices"][0]["problem"] == "too_many_decimals"
    blocked = await client.post(
        base, json={"to_currency": "RWF", "mode": "relabel", "confirmation": "RWF"}, headers=headers
    )
    assert blocked.status_code == 409
    assert blocked.json()["error"]["code"] == "RELABEL_PRECISION"

    preview = (
        await client.post(
            f"{base}/preview", json={"to_currency": "USD", "mode": "relabel"}, headers=headers
        )
    ).json()
    assert preview["confirmation_text"] == "USD"
    assert preview["rate"] is None
    assert preview["history"]["orders"] == 1
    assert preview["history"]["has_history"] is True
    assert preview["prices"][0]["after"] == {"amount": "7.99", "currency": "USD"}

    wrong = await client.post(
        base, json={"to_currency": "USD", "mode": "relabel", "confirmation": "yes"}, headers=headers
    )
    assert wrong.status_code == 422
    assert wrong.json()["error"]["code"] == "CONFIRMATION_MISMATCH"

    done = await client.post(
        base,
        json={"to_currency": "USD", "mode": "relabel", "confirmation": " usd "},
        headers=headers,
    )
    assert done.status_code == 200, done.text
    assert done.json()["kitchen"]["currency"] == "USD"

    orders = (await client.get(f"/api/v1/kitchens/{kid}/orders", headers=headers)).json()
    first = orders[0] if isinstance(orders, list) else orders["items"][0]
    detail = (
        await client.get(f"/api/v1/kitchens/{kid}/orders/{first['id']}", headers=headers)
    ).json()
    # Past orders keep the currency they were placed in.
    assert detail["lines"][0]["unit_price_money"] == {"amount": "0.50", "currency": "EUR"}

    same = await client.post(
        f"{base}/preview", json={"to_currency": "USD", "mode": "relabel"}, headers=headers
    )
    assert same.status_code == 422
    # PATCH still cannot change the currency directly.
    patch = await client.patch(f"/api/v1/kitchens/{kid}", json={"currency": "EUR"}, headers=headers)
    assert patch.status_code == 409
