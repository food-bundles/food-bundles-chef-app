"""Shared gateway machinery: prompts, image validation, limits, caching and the
structured model call (validate → one repair attempt → typed error).

Observability: every call logs one `ai_call` event with feature, prompt version,
model, latency, token usage, outcome and request ID — never prompts, images or answers.
Images are processed in memory only and are not stored by the gateway.
"""

from __future__ import annotations

import base64
import hashlib
import json
import re
import time
from collections import OrderedDict
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path
from string import Template
from typing import TypeVar

import httpx
import structlog
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.core.exceptions import (
    AiBadOutputError,
    AiImageInvalidError,
    AiProviderError,
    AiRateLimitError,
    AiTimeoutError,
)
from app.integrations.meta_model_api.client import MetaModelAPIError, get_client

logger = structlog.get_logger(__name__)

T = TypeVar("T", bound=BaseModel)

_PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"
LANGUAGE_NAMES = {"en": "English", "fr": "French", "rw": "Kinyarwanda"}


# ── Prompts ────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Prompt:
    name: str
    version: str
    template: Template

    @property
    def id(self) -> str:
        return f"{self.name}.{self.version}"

    def render(self, **values: str) -> str:
        return self.template.safe_substitute(**values)


@lru_cache(maxsize=32)
def load_prompt(name: str, version: str) -> Prompt:
    """Load a versioned prompt file `prompts/{name}.{version}.md`."""
    text = (_PROMPT_DIR / f"{name}.{version}.md").read_text(encoding="utf-8")
    return Prompt(name=name, version=version, template=Template(text))


def language_name(code: str) -> str:
    return LANGUAGE_NAMES.get(code[:2].lower(), "English")


# ── Images ─────────────────────────────────────────────────────────────────────


def validate_image(data: bytes) -> str:
    """Return the image MIME type after checking size and magic bytes."""
    if not data or len(data) > settings.AI_MAX_IMAGE_SIZE_BYTES:
        raise AiImageInvalidError()
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    raise AiImageInvalidError()


def image_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# ── Per-kitchen and per-chef daily limits (process-local) ──────────────────────

_daily_counts: dict[tuple[str, date], int] = {}


def _over_limit(subject: str, limit: int, today: date) -> bool:
    return limit > 0 and _daily_counts.get((subject, today), 0) >= limit


def check_rate_limit(kitchen_id: str, chef_id: str | None = None) -> None:
    """Enforce AI_MAX_REQUESTS_PER_KITCHEN_PER_DAY and AI_MAX_REQUESTS_PER_CHEF_PER_DAY.

    0 = unlimited. A request counts against both budgets only when it passes both.
    Process-local: with several workers the effective limit is per worker.
    Move to Redis/DB before scaling horizontally.
    """
    today = date.today()
    budgets = [(f"kitchen:{kitchen_id}", settings.AI_MAX_REQUESTS_PER_KITCHEN_PER_DAY)]
    if chef_id:
        budgets.append((f"chef:{chef_id}", settings.AI_MAX_REQUESTS_PER_CHEF_PER_DAY))
    active = [(subject, limit) for subject, limit in budgets if limit > 0]
    if not active:
        return
    if any(_over_limit(subject, limit, today) for subject, limit in active):
        raise AiRateLimitError()
    for subject, _limit in active:
        _daily_counts[(subject, today)] = _daily_counts.get((subject, today), 0) + 1
    if len(_daily_counts) > 10_000:
        for k in [k for k in _daily_counts if k[1] != today]:
            del _daily_counts[k]


# ── Classification cache (by image hash) ───────────────────────────────────────


class TTLCache:
    def __init__(self, max_items: int = 512, ttl_seconds: int = 24 * 3600) -> None:
        self._items: OrderedDict[str, tuple[float, BaseModel]] = OrderedDict()
        self._max = max_items
        self._ttl = ttl_seconds

    def get(self, key: str) -> BaseModel | None:
        hit = self._items.get(key)
        if hit is None:
            return None
        expires, value = hit
        if expires < time.monotonic():
            del self._items[key]
            return None
        self._items.move_to_end(key)
        return value

    def set(self, key: str, value: BaseModel) -> None:
        self._items[key] = (time.monotonic() + self._ttl, value)
        self._items.move_to_end(key)
        while len(self._items) > self._max:
            self._items.popitem(last=False)


classification_cache = TTLCache()


# ── Structured call ────────────────────────────────────────────────────────────


def extract_json(raw: str) -> str:
    """First balanced {...} block, tolerating markdown fences or preamble."""
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fenced:
        return fenced.group(1)
    start = raw.find("{")
    if start == -1:
        return raw
    depth = 0
    in_string = False
    escaped = False
    for i, ch in enumerate(raw[start:], start):
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return raw[start : i + 1]
    return raw[start:]


def _parse(raw: str, schema: type[T]) -> T:
    return schema.model_validate(json.loads(extract_json(raw)))


def _user_content(text: str, image: bytes | None, mime: str | None) -> list[dict] | str:
    if image is None or mime is None:
        return text
    data_url = f"data:{mime};base64,{base64.b64encode(image).decode('ascii')}"
    return [
        {"type": "image_url", "image_url": {"url": data_url}},
        {"type": "text", "text": text},
    ]


async def structured_call(
    *,
    feature: str,
    prompt: Prompt,
    system: str,
    user_text: str,
    schema: type[T],
    timeout_seconds: float,
    request_id: str,
    kitchen_id: str,
    model: str | None = None,
    image: bytes | None = None,
    image_mime: str | None = None,
    conversation: list[dict] | None = None,
) -> T:
    """Call the model, validate the JSON answer against `schema`, repair once.

    `conversation` (prior user/assistant turns) is sent before the final user turn.
    Raises AiTimeoutError, AiProviderError or AiBadOutputError — never returns raw text.
    """
    model_id = model or settings.META_MUSE_SPARK_MODEL
    client = get_client()
    messages: list[dict] = [
        {"role": "system", "content": system},
        *(conversation or []),
        {"role": "user", "content": _user_content(user_text, image, image_mime)},
    ]
    started = time.monotonic()
    usage_total: dict[str, int] = {}
    outcome = "provider_error"

    def _add_usage(usage: dict) -> None:
        for k in ("prompt_tokens", "completion_tokens", "total_tokens"):
            if isinstance(usage.get(k), int):
                usage_total[k] = usage_total.get(k, 0) + usage[k]

    try:
        raw, usage = await client.chat_completion(messages, model_id, timeout_seconds)
        _add_usage(usage)
        try:
            result = _parse(raw, schema)
            outcome = "success"
            return result
        except (json.JSONDecodeError, ValidationError) as first_error:
            # One repair attempt: show the model its answer and the validation errors.
            remaining = max(3.0, timeout_seconds - (time.monotonic() - started))
            repair_messages = [
                *messages,
                {"role": "assistant", "content": raw[:6000]},
                {
                    "role": "user",
                    "content": (
                        "Your answer was not valid for the required JSON schema. "
                        f"Problems: {str(first_error)[:800]}. "
                        "Reply again with ONLY the corrected JSON object."
                    ),
                },
            ]
            raw2, usage2 = await client.chat_completion(repair_messages, model_id, remaining)
            _add_usage(usage2)
            try:
                result = _parse(raw2, schema)
                outcome = "repaired"
                return result
            except (json.JSONDecodeError, ValidationError) as exc:
                outcome = "schema_fail"
                raise AiBadOutputError() from exc
    except httpx.TimeoutException as exc:
        outcome = "timeout"
        raise AiTimeoutError() from exc
    except MetaModelAPIError as exc:
        outcome = "rate_limited" if exc.status_code == 429 else "provider_error"
        raise AiProviderError(f"{feature} provider error") from exc
    finally:
        logger.info(
            "ai_call",
            feature=feature,
            prompt_version=prompt.id,
            model=model_id,
            latency_ms=round((time.monotonic() - started) * 1000),
            outcome=outcome,
            request_id=request_id,
            kitchen_id=kitchen_id,
            **usage_total,
        )
