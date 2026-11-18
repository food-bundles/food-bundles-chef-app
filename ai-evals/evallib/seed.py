"""Create the deterministic eval kitchen (fixtures/eval-kitchen.json) through the public API."""
from __future__ import annotations

import json
from pathlib import Path

import httpx


def seed_kitchen(client: httpx.Client, run_id: str, fixture: Path) -> dict:
    """Create a fresh kitchen with ingredients, stock, menu and recipes. Returns ids by name."""
    data = json.loads(fixture.read_text(encoding="utf-8"))
    kitchen = _ok(client.post("/kitchens", json={"name": f"AI eval kitchen {run_id}", "location": "Kigali"})).json()
    kid = kitchen["id"]

    ingredients: dict[str, str] = {}
    for ing in data["ingredients"]:
        created = _ok(
            client.post(
                f"/kitchens/{kid}/ingredients",
                json={"name": ing["name"], "unit": ing["unit"], "cost_per_unit": ing["cost_per_unit"]},
            )
        ).json()
        ingredients[ing["name"]] = created["id"]
        _ok(
            client.post(
                f"/kitchens/{kid}/inventory",
                json={"ingredient_id": created["id"], "quantity": ing["stock"], "change": "set", "entry_type": "opening"},
            )
        )

    menu = _ok(client.post(f"/kitchens/{kid}/menus", json={"name": "Eval menu"})).json()
    items: dict[str, str] = {}
    for item in data["menu"]:
        created = _ok(
            client.post(
                f"/kitchens/{kid}/menus/{menu['id']}/items",
                json={"name": item["name"], "selling_price": item["selling_price"], "category": item["category"]},
            )
        ).json()
        items[item["name"]] = created["id"]
        for line in item["recipe"]:
            _ok(
                client.post(
                    f"/kitchens/{kid}/menu-items/{created['id']}/recipe",
                    json={
                        "ingredient_id": ingredients[line["ingredient"]],
                        "qty_per_portion": line["qty_per_portion"],
                        "unit": line["unit"],
                    },
                )
            )
    return {"kitchen_id": kid, "ingredients": ingredients, "menu_items": items}


def snapshot(client: httpx.Client, kitchen_id: str) -> dict:
    """Stock levels and today's sales — compared before/after the chat suite (0 unconfirmed writes)."""
    stock = _ok(client.get(f"/kitchens/{kitchen_id}/inventory")).json()
    sales = _ok(client.get(f"/kitchens/{kitchen_id}/sales/daily-summary")).json()
    return {
        "stock": {row["ingredient_id"]: row["current_stock"] for row in stock},
        "portions_today": sales.get("portions"),
    }


def _ok(response: httpx.Response) -> httpx.Response:
    if response.status_code >= 400:
        raise RuntimeError(f"{response.request.method} {response.request.url.path} → HTTP {response.status_code}")
    return response
