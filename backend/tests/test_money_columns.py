"""Step 2a build step 2: money columns, dual-write, API money objects, migration pre-check."""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace

import pytest
from app.core.exceptions import AmountPrecisionError, OtherCurrencyNotSupportedError
from app.core.security import create_access_token
from app.modules.chefs.models import Chef
from app.shared.money_fields import (
    AmountRow,
    check_unit_cost,
    find_inexact_amounts,
    resolve_currency,
    set_price,
)
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

D = Decimal
_PHONE = [0]


# ── pure helpers ──────────────────────────────────────────────────────────────


def test_migration_precheck_finds_fractional_rwf_only() -> None:
    rows = [
        AmountRow("menu_items", "a", D("1500.00"), "RWF"),  # 1500 RWF: fine
        AmountRow("menu_items", "b", D("1500.50"), "RWF"),  # RWF has no decimals: stop
        AmountRow("order_lines", "c", D("7.99"), "USD"),
        AmountRow("order_lines", "d", D("7.995"), "USD"),  # 3 decimals in USD: stop
        AmountRow("catalog_products", "e", D("0.125"), "KWD"),  # KWD has 3: fine
    ]
    assert [r.row_id for r in find_inexact_amounts(rows)] == ["b", "d"]


def test_set_price_writes_decimal_minor_and_currency_together() -> None:
    row = SimpleNamespace()
    set_price(row, "selling_price", D("7.99"), "EUR")
    assert (row.selling_price, row.selling_price_minor, row.selling_price_currency) == (
        D("7.99"),
        799,
        "EUR",
    )
    set_price(row, "selling_price", D("3500"), "RWF")
    assert (row.selling_price_minor, row.selling_price_currency) == (3500, "RWF")
    with pytest.raises(AmountPrecisionError):
        set_price(row, "selling_price", D("1500.50"), "RWF")


def test_other_currencies_wait_for_conversion() -> None:
    kitchen = SimpleNamespace(currency="RWF")
    assert resolve_currency(kitchen, None) == "RWF"
    assert resolve_currency(kitchen, "rwf") == "RWF"
    with pytest.raises(OtherCurrencyNotSupportedError):
        resolve_currency(kitchen, "USD")


def test_unit_costs_keep_six_decimals_and_refuse_more() -> None:
    assert check_unit_cost(D("0.354321")) == D("0.354321")
    with pytest.raises(AmountPrecisionError):
        check_unit_cost(D("0.3543219"))


# ── API ───────────────────────────────────────────────────────────────────────


async def _kitchen(
    client: AsyncClient, db: AsyncSession, currency: str, zone: str, country: str
) -> tuple[str, dict]:
    _PHONE[0] += 1
    chef = Chef(phone_number=f"+2507830{_PHONE[0]:05d}", name="Money Chef")
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


async def _menu(client: AsyncClient, kid: str, headers: dict) -> str:
    resp = await client.post(
        f"/api/v1/kitchens/{kid}/menus", json={"name": "Main"}, headers=headers
    )
    return resp.json()["id"]


async def test_menu_prices_carry_their_currency(client: AsyncClient, db: AsyncSession) -> None:
    kid, headers = await _kitchen(client, db, "EUR", "Europe/Paris", "FR")
    menu = await _menu(client, kid, headers)
    resp = await client.post(
        f"/api/v1/kitchens/{kid}/menus/{menu}/items",
        json={"name": "Croque", "selling_price": "7.99", "category": "main"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["selling_price_money"] == {"amount": "7.99", "currency": "EUR"}
    assert body["selling_price_currency"] == "EUR"
    assert D(body["selling_price"]) == D("7.99")  # deprecated field kept for one release

    update = await client.patch(
        f"/api/v1/kitchens/{kid}/menus/{menu}/items/{body['id']}",
        json={"selling_price": "8.50"},
        headers=headers,
    )
    assert update.status_code == 200, update.text
    assert update.json()["selling_price_money"] == {"amount": "8.50", "currency": "EUR"}


async def test_rwf_price_with_decimals_is_refused_not_rounded(
    client: AsyncClient, db: AsyncSession
) -> None:
    kid, headers = await _kitchen(client, db, "RWF", "Africa/Kigali", "RW")
    menu = await _menu(client, kid, headers)
    url = f"/api/v1/kitchens/{kid}/menus/{menu}/items"
    refused = await client.post(
        url, json={"name": "Chips", "selling_price": "1500.50"}, headers=headers
    )
    assert refused.status_code == 422
    assert refused.json()["error"]["code"] == "AMOUNT_PRECISION"
    ok = await client.post(url, json={"name": "Chips", "selling_price": "1500"}, headers=headers)
    assert ok.json()["selling_price_money"] == {"amount": "1500", "currency": "RWF"}


async def test_other_currency_refused_until_conversion(
    client: AsyncClient, db: AsyncSession
) -> None:
    kid, headers = await _kitchen(client, db, "RWF", "Africa/Kigali", "RW")
    menu = await _menu(client, kid, headers)
    resp = await client.post(
        f"/api/v1/kitchens/{kid}/menus/{menu}/items",
        json={"name": "Burger", "selling_price": "5", "selling_price_currency": "USD"},
        headers=headers,
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "OTHER_CURRENCY_NOT_SUPPORTED"


async def test_order_lines_and_ingredient_costs_carry_currency(
    client: AsyncClient, db: AsyncSession
) -> None:
    kid, headers = await _kitchen(client, db, "EUR", "Europe/Paris", "FR")
    order = await client.post(
        f"/api/v1/kitchens/{kid}/orders",
        json={
            "lines": [
                {
                    "catalog_product_id": "manual",
                    "product_name": "Tomatoes",
                    "unit": "kg",
                    "quantity_ordered": "5",
                    "unit_price": "2.40",
                }
            ]
        },
        headers=headers,
    )
    assert order.status_code == 201, order.text
    assert order.json()["lines"][0]["unit_price_money"] == {"amount": "2.40", "currency": "EUR"}

    ing = await client.post(
        f"/api/v1/kitchens/{kid}/ingredients",
        json={"name": "Flour", "unit": "g", "cost_per_unit": "0.001250"},
        headers=headers,
    )
    assert ing.status_code == 201, ing.text
    assert ing.json()["cost_per_unit_currency"] == "EUR"
    assert D(ing.json()["cost_per_unit"]) == D("0.00125")


async def test_kitchen_price_step(client: AsyncClient, db: AsyncSession) -> None:
    kid, headers = await _kitchen(client, db, "RWF", "Africa/Kigali", "RW")
    url = f"/api/v1/kitchens/{kid}"
    assert (await client.patch(url, json={"price_step": "50"}, headers=headers)).json()[
        "price_step"
    ] == "50.0000"
    bad = await client.patch(url, json={"price_step": "50.5"}, headers=headers)
    assert bad.status_code == 422
    cleared = await client.patch(url, json={"price_step": "0"}, headers=headers)
    assert cleared.json()["price_step"] is None
