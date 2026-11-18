"""Shared gateway machinery: prompts, image validation, limits, caching and the
structured model call, routed Anthropic (primary) → Meta (fallback) by
`providers.router` (validate → one repair per provider → typed error).

Observability: the router logs one `ai_call` event per call with feature, prompt
version, providers attempted/served, fallback reason, model, latency, tokens, cost,
outcome and request ID — never prompts, images or answers.
Images are processed in memory only and are not stored by the gateway.
"""

from __future__ import annotations

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

import structlog
from pydantic import BaseModel

from app.core.config import settings
from app.core.exceptions import AiImageInvalidError, AiRateLimitError
from app.modules.ai.providers.base import ImagePart, LLMRequest, Message, Tier
from app.modules.ai.providers.router import provider_router

logger = structlog.get_logger(__name__)

T = TypeVar("T", bound=BaseModel)

_PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"
LANGUAGE_NAMES = {"en": "English", "fr": "French", "rw": "Kinyarwanda"}


# ── Prompts ────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Prompt:
    name: str
    version: str
    template: Template  # the meta.md text (default for every provider)
    variants: tuple[tuple[str, Template], ...] = ()  # provider-specific overrides

    @property
    def id(self) -> str:
        return f"{self.name}.{self.version}"

    def render(self, provider: str = "meta", **values: str) -> str:
        template = dict(self.variants).get(provider, self.template)
        return template.safe_substitute(**values)

    def has_variant(self, provider: str) -> bool:
        return provider in dict(self.variants)


@lru_cache(maxsize=32)
def load_prompt(name: str, version: str) -> Prompt:
    """Load `prompts/{name}/{version}/meta.md` plus any `{provider}.md` variant beside it.

    A provider without its own file uses meta.md, so variants exist only where needed.
    """
    folder = _PROMPT_DIR / name / version
    text = (folder / "meta.md").read_text(encoding="utf-8")
    variants = tuple(
        (path.stem, Template(path.read_text(encoding="utf-8")))
        for path in sorted(folder.glob("*.md"))
        if path.stem != "meta"
    )
    return Prompt(name=name, version=version, template=Template(text), variants=variants)


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


def _message(role: str, content: str | list | None) -> Message:
    """Prior-turn dict ({role, content}) → neutral message."""
    text = content if isinstance(content, str) else json.dumps(content or "")
    return Message.text("assistant" if role == "assistant" else "user", text)


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
    tier: Tier = "standard",
    effort: str | None = None,
    wire_schema: dict | None = None,
    anthropic_system: str | None = None,
    max_tokens: int = 4096,
    locale: str = "en",
) -> T:
    """Route the call (Anthropic primary, Meta fallback), validate against `schema`,
    repair once per provider.

    `model` is the Meta model to use (fallback path, unchanged from before Phase 8);
    Anthropic picks its model from `tier` via settings. `wire_schema` overrides the
    JSON schema sent for structured outputs (validation always uses `schema`).
    `timeout_seconds` is the TOTAL budget, fallback included.
    Raises AiTimeoutError, AiProviderError, AiBadOutputError, AiRefusedError,
    AiUnavailableError or AiBudgetExceededError — never returns raw text.
    """
    parts: tuple = (
        (ImagePart(image, image_mime), user_text) if image and image_mime else (user_text,)
    )
    systems = {"meta": system}
    if anthropic_system:
        systems["anthropic"] = anthropic_system
    request = LLMRequest(
        feature=feature,
        prompt_version=prompt.id,
        systems=systems,
        messages=[
            *(_message(m.get("role", "user"), m.get("content")) for m in conversation or []),
            Message(role="user", parts=parts),
        ],
        request_id=request_id,
        kitchen_id=kitchen_id,
        output_schema=wire_schema or schema.model_json_schema(),
        max_tokens=max_tokens,
        tier=tier,
        effort=effort,
        locale=locale,
        meta_model=model or settings.META_MUSE_SPARK_MODEL,
    )
    routed = await provider_router.run(
        request, parse=lambda raw: _parse(raw, schema), budget_seconds=timeout_seconds
    )
    return routed.value
