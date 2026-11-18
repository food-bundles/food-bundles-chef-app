"""Baseline contract: with ANTHROPIC_API_KEY unset every AI feature runs on the Meta path
exactly as before Phase 8 — same Meta request shape, same parsed responses.

The Meta HTTP client is replaced by a recorder that returns fixed model answers, so the
test exercises the real endpoints, router, prompts, validation and deterministic parsing.
"""

from __future__ import annotations

import json
from typing import Any

import pytest
from app.core import config as cfg
from app.core.security import create_access_token
from app.modules.ai.gateway.core import classification_cache
from app.modules.ai.providers import health
from app.modules.ai.providers.router import provider_router
from app.modules.ai.providers.spend import BudgetDecision
from app.modules.chefs.models import Chef
from httpx import AsyncClient
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession

pytestmark = pytest.mark.asyncio

JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64

ANSWERS = {
    "classify": {"kind": "menu", "confidence": 0.93, "image_quality": "ok"},
    "menu": {
        "kind": "menu",
        "image_quality": "ok",
        "items": [
            {
                "name": "Brochette ",
                "category": "main",
                "price_text": "2.5k",
                "description": None,
                "name_confidence": 0.9,
                "price_confidence": 0.8,
                "source_text": "Brochette .... 2.5k",
            },
            {
                "name": "Fanta",
                "category": "drink",
                "price_text": "Frw 1,000",
                "description": None,
                "name_confidence": 0.95,
                "price_confidence": 0.9,
                "source_text": None,
            },
        ],
    },
    "document": {
        "kind": "delivery_note",
        "image_quality": "ok",
        "supplier_name": "Kigali Fresh ",
        "document_date": "2026-11-17",
        "lines": [
            {
                "name": "Tomatoes",
                "quantity_text": "25",
                "unit": "kg",
                "unit_price_text": None,
                "line_total_text": "Frw 25,000",
                "confidence": 0.9,
            }
        ],
    },
    "dish": {
        "kind": "dish",
        "image_quality": "ok",
        "dish_name": "Chips",
        "dish_name_confidence": 0.9,
        "category": "side",
        "category_confidence": 0.8,
        "ingredients": [
            {
                "name": "Potato",
                "qty_per_portion": 0.25,
                "unit": "kg",
                "ingredient_id": None,
                "confidence": 0.8,
            }
        ],
    },
    "agent": {
        "type": "clarification",
        "reply_text": "How many portions of Chips?",
        "question": "How many portions?",
        "options": ["10", "20"],
    },
}


class RecordingMetaClient:
    """Stands in for MetaModelAPIClient.chat_completion and records each request."""

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    async def chat_completion(self, messages, model, timeout_seconds, max_tokens=4096):
        self.calls.append(
            {
                "messages": messages,
                "model": model,
                "timeout": timeout_seconds,
                "max_tokens": max_tokens,
            }
        )
        user = messages[-1]["content"]
        text = user if isinstance(user, str) else user[-1]["text"]
        key = (
            "classify"
            if "Classify" in text
            else "menu"
            if "menu" in text
            else "document"
            if "delivered" in text
            else "dish"
            if "dish" in text
            else "agent"
        )
        return json.dumps(ANSWERS[key]), {"prompt_tokens": 100, "completion_tokens": 20}


class NoSpend:
    async def check(self, kitchen_id: str) -> BudgetDecision:
        return BudgetDecision(action="ok")

    async def record(self, **kwargs: Any) -> None:
        return None


class KillOff:
    async def is_on(self, provider: str) -> bool:
        return False


@pytest.fixture
def meta(monkeypatch: pytest.MonkeyPatch) -> RecordingMetaClient:
    s = cfg.settings
    recorder = RecordingMetaClient()
    monkeypatch.setattr("app.modules.ai.providers.meta_provider.get_client", lambda: recorder)
    monkeypatch.setattr(s, "ANTHROPIC_API_KEY", SecretStr(""))  # the no-key path
    monkeypatch.setattr(s, "MODEL_API_KEY", SecretStr("meta-test-key"))
    monkeypatch.setattr(s, "META_MUSE_SPARK_MODEL", "muse-spark-test")
    monkeypatch.setattr(s, "META_MUSE_SPARK_FAST_MODEL", "")
    monkeypatch.setattr(s, "AI_PRIMARY_PROVIDER", "anthropic")
    monkeypatch.setattr(s, "AI_FALLBACK_PROVIDER", "meta")
    for flag in (
        "AI_ENABLED",
        "AI_AGENT_ENABLED",
        "AI_IMAGE_CLASSIFY_ENABLED",
        "AI_MENU_SCAN_ENABLED",
        "AI_DISH_ANALYSIS_ENABLED",
        "AI_DOCUMENT_SCAN_ENABLED",
    ):
        monkeypatch.setattr(s, flag, True)
    monkeypatch.setattr(s, "AI_MAX_REQUESTS_PER_KITCHEN_PER_DAY", 0)
    monkeypatch.setattr(s, "AI_MAX_REQUESTS_PER_CHEF_PER_DAY", 0)
    monkeypatch.setattr(provider_router, "_spend", NoSpend())
    monkeypatch.setattr(provider_router, "_kill", KillOff())
    monkeypatch.setattr(provider_router, "_providers", None)
    provider_router._breakers.clear()
    classification_cache._items.clear()
    health.reset()
    return recorder


async def _kitchen(client: AsyncClient, db: AsyncSession) -> tuple[str, dict]:
    chef = Chef(phone_number="+250781099001", name="Baseline Chef")
    db.add(chef)
    await db.flush()
    headers = {"Authorization": f"Bearer {create_access_token(str(chef.id))}"}
    resp = await client.post(
        "/api/v1/kitchens",
        json={"name": "Baseline Kitchen", "currency": "RWF", "timezone": "Africa/Kigali"},
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()["id"], headers


def _image_form() -> dict:
    return {"files": {"image": ("photo.jpg", JPEG, "image/jpeg")}, "data": {"language": "en"}}


def _assert_meta_shape(call: dict[str, Any]) -> None:
    messages = call["messages"]
    assert messages[0]["role"] == "system"
    assert isinstance(messages[0]["content"], str)
    image_part, text_part = messages[-1]["content"]
    assert image_part["image_url"]["url"].startswith("data:image/jpeg;base64,")
    assert text_part["type"] == "text"
    assert call["model"] == "muse-spark-test"
    assert call["max_tokens"] == 4096 or call["max_tokens"] == 1024


async def test_all_features_on_meta_path_without_anthropic_key(
    client: AsyncClient, db: AsyncSession, meta: RecordingMetaClient
) -> None:
    kid, headers = await _kitchen(client, db)
    base = f"/api/v1/kitchens/{kid}/ai"

    # Classification
    resp = await client.post(f"{base}/classify-image", headers=headers, **_image_form())
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert (body["kind"], body["confidence"], body["prompt_version"]) == (
        "menu",
        0.93,
        "classify_image.v1",
    )
    _assert_meta_shape(meta.calls[-1])
    classify_budget = cfg.settings.AI_TIMEOUT_CLASSIFY_MS / 1000
    assert meta.calls[-1]["timeout"] == pytest.approx(classify_budget, abs=0.5)

    # Menu extraction: deterministic RWF parsing unchanged
    resp = await client.post(f"{base}/menu-extract", headers=headers, **_image_form())
    assert resp.status_code == 200, resp.text
    items = resp.json()["items"]
    assert [(i["name"], i["price"], i["category"]) for i in items] == [
        ("Brochette", 2500, "main"),
        ("Fanta", 1000, "drink"),
    ]
    _assert_meta_shape(meta.calls[-1])

    # Delivery note: unit price derived from the line total
    resp = await client.post(f"{base}/document-extract", headers=headers, **_image_form())
    assert resp.status_code == 200, resp.text
    doc = resp.json()
    assert doc["supplier_name"] == "Kigali Fresh"
    assert doc["lines"][0]["quantity"] == "25"
    assert doc["lines"][0]["unit_price"] == 1000
    assert doc["lines"][0]["line_total"] == 25000

    # Dish photo: no matched stock ingredient → no price, ingredient marked new
    resp = await client.post(f"{base}/dish-analyze", headers=headers, **_image_form())
    assert resp.status_code == 200, resp.text
    dish = resp.json()
    assert dish["dish_name"] == "Chips"
    assert dish["ingredients"][0]["ingredient_id"] is None
    assert dish["price"] is None

    # Assistant: clarification passes through unchanged
    resp = await client.post(
        f"{base}/agent",
        headers=headers,
        json={"messages": [{"role": "chef", "content": "record chips"}], "language": "en"},
    )
    assert resp.status_code == 200, resp.text
    agent = resp.json()
    assert agent["proposal"] is None
    assert agent["clarification"]["question"] == "How many portions?"
    agent_call = meta.calls[-1]
    assert agent_call["messages"][0]["role"] == "system"
    assert agent_call["messages"][-1] == {"role": "user", "content": "record chips"}

    assert len(meta.calls) == 5  # one Meta call per feature, no Anthropic attempt


async def test_meta_failure_without_key_returns_pre_phase8_error(
    client: AsyncClient, db: AsyncSession, meta: RecordingMetaClient, monkeypatch
) -> None:
    import httpx

    async def timeout(*args, **kwargs):
        raise httpx.ReadTimeout("slow")

    monkeypatch.setattr(meta, "chat_completion", timeout)
    kid, headers = await _kitchen(client, db)
    resp = await client.post(
        f"/api/v1/kitchens/{kid}/ai/classify-image", headers=headers, **_image_form()
    )
    assert resp.status_code == 504
    assert "AI_TIMEOUT" in resp.text


async def test_quality_assessment_routed_meta_only(
    client: AsyncClient, db: AsyncSession, meta: RecordingMetaClient, monkeypatch
) -> None:
    monkeypatch.setattr(cfg.settings, "AI_QUALITY_ASSESSMENT_ENABLED", True)
    # Even with an Anthropic key, quality assessment stays on Meta.
    monkeypatch.setattr(cfg.settings, "ANTHROPIC_API_KEY", SecretStr("would-be-used-if-routed"))

    async def answer(messages, model, timeout_seconds, max_tokens=4096):
        meta.calls.append({"messages": messages, "max_tokens": max_tokens})
        dims = {
            d: {"result": "pass", "confidence": 0.9}
            for d in ("freshness", "ripeness", "damage", "spoilage", "size_grade", "foreign_matter")
        }
        return json.dumps({**dims, "quantity_visible": False, "estimated_quantity": 12}), {}

    monkeypatch.setattr(meta, "chat_completion", answer)
    kid, headers = await _kitchen(client, db)
    resp = await client.post(
        f"/api/v1/kitchens/{kid}/ai/quality-assess",
        headers=headers,
        files={"image": ("crate.jpg", JPEG, "image/jpeg")},
        data={"product_name": "Tomatoes", "expected_unit": "kg"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["provider"] == "meta"
    assert len(body["dimensions"]) == 6
    # Crate not fully visible → no quantity estimate.
    assert body["quantity_estimate"]["estimated_quantity"] is None
    assert meta.calls[-1]["max_tokens"] == 1024
