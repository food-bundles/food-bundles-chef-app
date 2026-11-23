"""Provider adapters, catalog (capabilities, prices, wire schema), breaker, config checks."""

from __future__ import annotations

import base64
import json
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from app.core import config as cfg
from app.integrations.anthropic.client import AnthropicProvider, build_params, map_sdk_error
from app.integrations.meta_model_api.client import MetaModelAPIError
from app.modules.ai.providers import catalog, health
from app.modules.ai.providers.base import (
    ImagePart,
    LLMRequest,
    Message,
    ProviderAuth,
    ProviderBadRequest,
    ProviderNetwork,
    ProviderOverloaded,
    ProviderRateLimited,
    ProviderRefusal,
    ProviderTimeout,
    Usage,
)
from app.modules.ai.providers.breaker import CircuitBreaker
from app.modules.ai.providers.meta_provider import map_meta_error, to_meta_messages
from app.modules.ai.schemas.agent import ModelAgentTurnWire
from app.modules.ai.schemas.gateway import ModelDishAnalysis, ModelMenuExtraction
from pydantic import SecretStr

JPEG = b"\xff\xd8\xff" + b"0" * 32


def _request(**overrides) -> LLMRequest:
    values = {
        "feature": "menu_scan",
        "prompt_version": "menu_extract.v1",
        "systems": {"meta": "SYSTEM"},
        "messages": [Message(role="user", parts=(ImagePart(JPEG, "image/jpeg"), "List items."))],
        "request_id": "req-1",
        "kitchen_id": "k-1",
        "output_schema": ModelMenuExtraction.model_json_schema(),
        "tier": "standard",
        "effort": "low",
    }
    values.update(overrides)
    return LLMRequest(**values)


# ── catalog ────────────────────────────────────────────────────────────────────


def test_unknown_model_gets_no_temperature_and_no_effort() -> None:
    assert catalog.capabilities("some-new-model") == {
        "supports_temperature": False,
        "supports_effort": False,
    }


def test_tier_models_come_from_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cfg.settings, "ANTHROPIC_MODEL_FAST", "fast-x")
    assert catalog.anthropic_model("fast") == "fast-x"
    assert catalog.cheaper_tier("standard") == "fast"


def test_cost_uses_price_map(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        cfg.settings,
        "AI_MODEL_PRICES",
        {"m": {"input": 2.0, "output": 10.0, "cache_read": 0.2, "cache_write": 2.5}},
    )
    usage = Usage(input_tokens=1_000, output_tokens=500, cached_tokens=2_000, cache_write_tokens=0)
    # 1000*2 + 500*10 + 2000*0.2 = 7400 per million
    assert catalog.cost_usd("m", usage) == pytest.approx(0.0074)
    assert catalog.cost_usd("unpriced", usage) == 0.0


@pytest.mark.parametrize("model", [ModelMenuExtraction, ModelDishAnalysis, ModelAgentTurnWire])
def test_wire_schema_drops_unsupported_keywords(model: type) -> None:
    text = json.dumps(catalog.wire_schema(model.model_json_schema()))
    for keyword in (
        '"minimum"',
        '"maximum"',
        '"maxLength"',
        '"minLength"',
        '"pattern"',
        '"maxItems"',
    ):
        assert keyword not in text
    schema = catalog.wire_schema(model.model_json_schema())
    assert schema["additionalProperties"] is False


def test_agent_wire_schema_sends_params_as_string() -> None:
    # A free-form dict only allows {} under structured outputs, and a union of the
    # typed action shapes is rejected by the API as too large a grammar.
    schema = catalog.wire_schema(ModelAgentTurnWire.model_json_schema())
    params = schema["properties"]["params"]
    assert {"type": "string"} in params["anyOf"]
    assert "$defs" not in schema or len(schema["$defs"]) <= 1  # ActionType enum only
    assert len(json.dumps(schema)) < 2500  # was ~5 KB with the union


def test_agent_turn_decodes_string_params_and_validates_them() -> None:
    from app.modules.ai.schemas.agent import ModelAgentTurn

    item = "11111111-1111-1111-1111-111111111111"
    wire = {
        "type": "proposal",
        "reply_text": "Record 20 Chips?",
        "action_type": "record_sale",
        "summary": "Record 20 Chips",
        "params": json.dumps(
            {
                "menu_item_id": item,
                "menu_item_name": "Chips",
                "portions_sold": 20,
                "date": "2026-11-18",
            }
        ),
    }
    turn = ModelAgentTurn.model_validate(wire)
    assert turn.params is not None
    assert turn.params["portions_sold"] == 20
    # Same result as Meta's dict form.
    as_dict = ModelAgentTurn.model_validate({**wire, "params": json.loads(wire["params"])})
    assert as_dict.params == turn.params
    with pytest.raises(ValueError, match="params must be a JSON object"):
        ModelAgentTurn.model_validate({**wire, "params": "[1, 2]"})
    with pytest.raises(ValueError, match="Expecting property name"):  # invalid JSON
        ModelAgentTurn.model_validate({**wire, "params": "{not json"})


# ── Anthropic adapter ─────────────────────────────────────────────────────────


def test_anthropic_request_shape() -> None:
    params = build_params(_request(), "claude-sonnet-5-5")
    assert params["model"] == "claude-sonnet-5-5"
    assert params["system"][0]["text"] == "SYSTEM"
    assert params["system"][0]["cache_control"] == {"type": "ephemeral"}
    image, text = params["messages"][0]["content"]
    assert image["type"] == "image"
    assert image["source"]["media_type"] == "image/jpeg"
    assert base64.b64decode(image["source"]["data"]) == JPEG
    assert text == {"type": "text", "text": "List items."}
    assert params["output_config"]["format"]["type"] == "json_schema"
    assert params["output_config"]["effort"] == "low"
    assert "temperature" not in json.dumps(params)


def test_temperature_never_sent_when_unsupported() -> None:
    params = build_params(_request(temperature=0.0), "claude-haiku-5-5")
    assert "temperature" not in json.dumps(params)
    assert "extra_body" not in params


def test_effort_not_sent_to_models_without_support() -> None:
    params = build_params(_request(), "unknown-model")
    assert "effort" not in params["output_config"]


def test_anthropic_system_variant_used_when_present() -> None:
    req = _request(systems={"meta": "M", "anthropic": "A"})
    assert build_params(req, "claude-sonnet-5-5")["system"][0]["text"] == "A"


def _status_error(cls_name: str, status: int, headers: dict | None = None):
    import anthropic

    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    response = httpx.Response(status, headers=headers or {}, request=request)
    cls = getattr(anthropic, cls_name)
    return cls("error", response=response, body=None)


@pytest.mark.parametrize(
    ("cls_name", "status", "expected"),
    [
        ("RateLimitError", 429, ProviderRateLimited),
        ("AuthenticationError", 401, ProviderAuth),
        ("PermissionDeniedError", 403, ProviderAuth),
        ("BadRequestError", 400, ProviderBadRequest),
        ("InternalServerError", 500, ProviderOverloaded),
        ("APIStatusError", 529, ProviderOverloaded),
        ("NotFoundError", 404, ProviderBadRequest),
    ],
)
def test_sdk_error_mapping(cls_name: str, status: int, expected: type) -> None:
    pytest.importorskip("anthropic")
    try:
        exc = _status_error(cls_name, status, {"retry-after": "7"})
    except TypeError:
        pytest.skip(f"{cls_name} has a different constructor in this SDK version")
    mapped = map_sdk_error(exc)
    assert isinstance(mapped, expected)
    if expected is ProviderRateLimited:
        assert mapped.retry_after == 7.0


def test_sdk_timeout_and_connection_mapping() -> None:
    anthropic = pytest.importorskip("anthropic")
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    assert isinstance(map_sdk_error(anthropic.APITimeoutError(request=request)), ProviderTimeout)
    assert isinstance(map_sdk_error(anthropic.APIConnectionError(request=request)), ProviderNetwork)


class _FakeMessages:
    def __init__(self, response) -> None:
        self.response = response
        self.kwargs: dict = {}

    async def create(self, **kwargs):
        self.kwargs = kwargs
        return self.response


def _response(stop_reason: str, text: str = '{"kind": "menu", "items": []}'):
    return SimpleNamespace(
        stop_reason=stop_reason,
        stop_details=SimpleNamespace(category="cyber") if stop_reason == "refusal" else None,
        model="claude-sonnet-5-5",
        content=[SimpleNamespace(type="text", text=text)],
        usage=SimpleNamespace(
            input_tokens=100,
            output_tokens=20,
            cache_read_input_tokens=50,
            cache_creation_input_tokens=0,
        ),
    )


@pytest.mark.asyncio
async def test_anthropic_generate_returns_text_and_usage() -> None:
    messages = _FakeMessages(_response("end_turn"))
    provider = AnthropicProvider(client=SimpleNamespace(messages=messages))
    result = await provider.generate(_request(), 9.0)
    assert result.text.startswith("{")
    assert result.usage.cached_tokens == 50
    assert messages.kwargs["timeout"] == 9.0


@pytest.mark.asyncio
async def test_anthropic_refusal_raises_refusal() -> None:
    provider = AnthropicProvider(
        client=SimpleNamespace(messages=_FakeMessages(_response("refusal")))
    )
    with pytest.raises(ProviderRefusal):
        await provider.generate(_request(), 9.0)


def test_anthropic_configured_only_with_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cfg.settings, "ANTHROPIC_API_KEY", SecretStr(""))
    assert not AnthropicProvider().is_configured()
    monkeypatch.setattr(cfg.settings, "ANTHROPIC_API_KEY", SecretStr("test-key"))
    assert AnthropicProvider().is_configured()


# ── Meta adapter: same wire shape as before Phase 8 ───────────────────────────


def test_meta_messages_identical_to_pre_phase8_shape() -> None:
    req = _request()
    messages = to_meta_messages("SYSTEM", [Message.text("user", "hi"), *req.messages])
    assert messages[0] == {"role": "system", "content": "SYSTEM"}
    assert messages[1] == {"role": "user", "content": "hi"}
    image_part, text_part = messages[2]["content"]
    assert image_part["type"] == "image_url"
    assert image_part["image_url"]["url"].startswith("data:image/jpeg;base64,")
    assert text_part == {"type": "text", "text": "List items."}


@pytest.mark.parametrize(
    ("status", "message", "expected"),
    [
        (429, "rate", ProviderRateLimited),
        (401, "auth", ProviderAuth),
        (503, "down", ProviderOverloaded),
        (400, "bad", ProviderBadRequest),
        (0, "Meta API unreachable: x", ProviderNetwork),
    ],
)
def test_meta_error_mapping(status: int, message: str, expected: type) -> None:
    assert isinstance(map_meta_error(MetaModelAPIError(status, message)), expected)


# ── breaker ───────────────────────────────────────────────────────────────────


def test_breaker_cycle() -> None:
    now = [0.0]
    breaker = CircuitBreaker(2, 10.0, clock=lambda: now[0])
    breaker.record_failure()
    assert breaker.state == "closed"
    breaker.record_failure()
    assert breaker.state == "open"
    assert not breaker.allow()
    now[0] = 10.5
    assert breaker.allow()  # the single probe
    assert not breaker.allow()  # only one probe at a time
    breaker.record_failure()
    assert breaker.state == "open"  # probe failed → open again
    now[0] = 21.0
    assert breaker.allow()
    breaker.record_success()
    assert breaker.state == "closed"


# ── startup config: misspelled env var ────────────────────────────────────────


def test_env_typo_detected_and_never_used(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setattr(cfg.settings, "ANTHROPIC_API_KEY", SecretStr(""))
    assert health.env_name_typo_present({"ANTROPIC_API_KEY": "x"}, tmp_path / "none.env")
    env_file = tmp_path / ".env"
    env_file.write_text("ANTROPIC_API_KEY=x\n", encoding="utf-8")
    assert health.env_name_typo_present({}, env_file)
    # The typo value is never used as the key.
    assert not AnthropicProvider().is_configured()


def test_env_typo_ignored_when_correct_name_set(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(cfg.settings, "ANTHROPIC_API_KEY", SecretStr("real"))
    assert not health.env_name_typo_present({"ANTROPIC_API_KEY": "x"}, tmp_path / "none.env")


def test_env_key_shadowed_by_process_variable(tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("ANTHROPIC_API_KEY=from-file\n", encoding="utf-8")
    assert health.env_key_shadowed({"ANTHROPIC_API_KEY": "stale-user-var"}, env_file)
    assert not health.env_key_shadowed({"ANTHROPIC_API_KEY": "from-file"}, env_file)
    assert not health.env_key_shadowed({}, env_file)
    assert not health.env_key_shadowed({"ANTHROPIC_API_KEY": "x"}, tmp_path / "none.env")


def test_startup_warns_when_env_shadows_dotenv_without_values(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from structlog.testing import capture_logs

    monkeypatch.setattr(cfg.settings, "AI_PRIMARY_PROVIDER", "anthropic")
    monkeypatch.setattr(health, "env_key_shadowed", lambda: True)
    with capture_logs() as logs:
        health.check_configuration()
    hits = [e for e in logs if "overrides a different value in .env" in e.get("message", "")]
    assert len(hits) == 1
    assert "stale-user-var" not in json.dumps(hits, default=str)


def test_startup_check_flags_typo(monkeypatch: pytest.MonkeyPatch) -> None:
    from structlog.testing import capture_logs

    health.reset()
    monkeypatch.setattr(cfg.settings, "AI_PRIMARY_PROVIDER", "anthropic")
    monkeypatch.setattr(cfg.settings, "ANTHROPIC_API_KEY", SecretStr(""))
    monkeypatch.setenv("ANTROPIC_API_KEY", "x")
    with capture_logs() as logs:
        health.check_configuration()
    messages = [e.get("message", "") for e in logs]
    assert "found ANTROPIC_API_KEY — rename to ANTHROPIC_API_KEY" in messages
    assert health.stats("anthropic").misconfigured == "env_name_typo"


def test_settings_repr_hides_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cfg.settings, "ANTHROPIC_API_KEY", SecretStr("sk-ant-should-not-print"))
    monkeypatch.setattr(cfg.settings, "MODEL_API_KEY", SecretStr("meta-should-not-print"))
    db_url = "postgresql+asyncpg://app:db-pass-should-not-print@db:5432/app"
    monkeypatch.setattr(cfg.settings, "DATABASE_URL", SecretStr(db_url))
    monkeypatch.setattr(cfg.settings, "DATABASE_URL_SYNC", SecretStr(db_url))
    text = repr(cfg.settings) + str(cfg.settings) + cfg.settings.model_dump_json()
    assert "should-not-print" not in text


def test_meta_models_are_priced_from_published_standard_rates() -> None:
    usage = Usage(input_tokens=1_000_000, output_tokens=1_000_000, cached_tokens=1_000_000)
    # $1.25 input + $4.25 output + $0.15 cache read (Meta pricing page, fetched 2026-11-18)
    assert catalog.cost_usd("muse-spark-1.3", usage) == pytest.approx(5.65)
