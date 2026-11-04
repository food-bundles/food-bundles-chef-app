"""Anthropic Messages API client (httpx-based, no SDK dependency).

Uses the claude-sonnet-4-5 model (or whatever ANTHROPIC_AGENT_MODEL is set to).
All calls are JSON-only; no streaming.
"""
from __future__ import annotations

import json
from typing import Any

import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

_ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
_ANTHROPIC_API_VERSION = "2023-06-01"


async def chat(
    system_prompt: str,
    messages: list[dict[str, str]],
    max_tokens: int | None = None,
) -> str:
    """Send a messages request to the Anthropic API and return the text content.

    Raises httpx.HTTPStatusError on non-2xx responses.
    Never logs the system_prompt or message content (AI_LOG_CONTENT=False).
    """
    payload: dict[str, Any] = {
        "model": settings.ANTHROPIC_AGENT_MODEL,
        "max_tokens": max_tokens or settings.ANTHROPIC_AGENT_MAX_TOKENS,
        "system": system_prompt,
        "messages": messages,
    }

    headers = {
        "x-api-key": settings.ANTHROPIC_API_KEY,
        "anthropic-version": _ANTHROPIC_API_VERSION,
        "content-type": "application/json",
    }

    async with httpx.AsyncClient(timeout=settings.AI_DEFAULT_TIMEOUT_SECONDS) as client:
        response = await client.post(_ANTHROPIC_API_URL, json=payload, headers=headers)
        response.raise_for_status()

    body = response.json()
    # Content is a list of blocks; extract first text block
    content_blocks = body.get("content", [])
    for block in content_blocks:
        if block.get("type") == "text":
            return block["text"]

    logger.warning("anthropic_no_text_block", model=settings.ANTHROPIC_AGENT_MODEL)
    return ""
