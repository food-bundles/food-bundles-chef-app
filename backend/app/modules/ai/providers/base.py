"""Provider-neutral request/result types and typed provider errors.

Feature code never sees a provider SDK type. Adapters translate the neutral
request into their wire format and map their errors onto the classes below,
which the router uses to decide between retry, failover and a hard error.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

ProviderName = Literal["anthropic", "meta"]
Tier = Literal["fast", "standard", "advanced"]


@dataclass(frozen=True)
class ImagePart:
    data: bytes
    mime: str


@dataclass(frozen=True)
class Message:
    """One neutral chat message. `parts` holds text strings and images in order."""

    role: Literal["user", "assistant"]
    parts: tuple[str | ImagePart, ...]

    @staticmethod
    def text(role: Literal["user", "assistant"], text: str) -> Message:
        return Message(role=role, parts=(text,))


@dataclass
class LLMRequest:
    feature: str
    prompt_version: str
    # System prompt per provider; "meta" is the default for any provider without its own.
    systems: dict[str, str]
    messages: list[Message]
    request_id: str
    kitchen_id: str
    output_schema: dict[str, Any] | None = None  # JSON schema of the expected object
    max_tokens: int = 4096
    tier: Tier = "standard"
    effort: str | None = None
    temperature: float | None = None  # sent only to models that support it
    locale: str = "en"
    chef_id: str | None = None
    # Meta keeps its own model choice (e.g. the fast Muse model for classification).
    meta_model: str | None = None

    def system_for(self, provider: str) -> str:
        return self.systems.get(provider) or self.systems.get("meta", "")


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0
    cached_tokens: int = 0  # cache reads
    cache_write_tokens: int = 0

    def add(self, other: Usage) -> None:
        self.input_tokens += other.input_tokens
        self.output_tokens += other.output_tokens
        self.cached_tokens += other.cached_tokens
        self.cache_write_tokens += other.cache_write_tokens


@dataclass
class LLMResult:
    text: str
    provider: str
    model: str
    latency_ms: int
    finish_reason: str
    usage: Usage = field(default_factory=Usage)


class LLMProvider(Protocol):
    name: str

    def is_configured(self) -> bool:
        """True when credentials and a model are present (no network call)."""
        ...

    async def generate(self, request: LLMRequest, timeout_seconds: float) -> LLMResult: ...


# ── Typed errors ───────────────────────────────────────────────────────────────


class ProviderError(Exception):
    """Base class. `kind` is logged as the fallback reason."""

    kind = "error"
    retryable = False  # retry the same provider (if time allows)
    failover = True  # try the next provider
    counts_for_breaker = True

    def __init__(self, message: str = "", *, status_code: int | None = None) -> None:
        super().__init__(message or self.kind)
        self.status_code = status_code


class ProviderTimeout(ProviderError):  # noqa: N818 — named by failure kind
    kind = "timeout"


class ProviderNetwork(ProviderError):  # noqa: N818 — named by failure kind
    kind = "network"
    retryable = True


class ProviderOverloaded(ProviderError):  # noqa: N818 — named by failure kind
    """5xx, including Anthropic 529 overloaded_error."""

    kind = "overloaded"
    retryable = True


class ProviderRateLimited(ProviderError):  # noqa: N818 — named by failure kind
    kind = "rate_limited"
    retryable = True

    def __init__(self, message: str = "", *, retry_after: float | None = None) -> None:
        super().__init__(message, status_code=429)
        self.retry_after = retry_after


class ProviderAuth(ProviderError):  # noqa: N818 — named by failure kind
    """401/403: fall back so chefs are not blocked, flag the provider as misconfigured."""

    kind = "auth"


class ProviderBadRequest(ProviderError):  # noqa: N818 — named by failure kind
    """400: our bug. No failover — the other provider would hide it."""

    kind = "bad_request"
    failover = False
    counts_for_breaker = False


class ProviderRefusal(ProviderError):  # noqa: N818 — named by failure kind
    """The model declined. Never routed to another provider."""

    kind = "refused"
    failover = False
    counts_for_breaker = False


class ProviderSchemaError(ProviderError):
    """Output still invalid after the one repair attempt."""

    kind = "schema_fail"
    counts_for_breaker = False


class ProviderUnexpected(ProviderError):  # noqa: N818 — named by failure kind
    kind = "unexpected"


@dataclass
class StreamChunk:
    """One piece of a streamed answer. The last chunk carries `final` (full text, usage)."""

    text: str = ""
    final: LLMResult | None = None
