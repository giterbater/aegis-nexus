"""
AEGIS NEXUS — Python Model Router

High-performance routing layer for AI model inference. 
Attempts to use Anthropic Claude (with prompt caching) by default, 
falling back to a local Ollama instance if the API key is missing 
or a request failure occurs.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import AsyncIterator, Literal

import anthropic
import httpx

logger = logging.getLogger("aegis.model_router")

# --- Configuration ---

ANTHROPIC_KEY   = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-5")

OLLAMA_BASE     = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "llama3.2")

Provider = Literal["anthropic", "ollama"]


@dataclass
class ModelResponse:
    """Unified response format for model completions."""
    text:          str
    model:         str
    provider:      Provider
    input_tokens:  int  = 0
    output_tokens: int  = 0
    cached:        bool = False
    duration_ms:   int  = 0


@dataclass
class StreamChunk:
    """Represents a single chunk in a streaming response."""
    text:     str
    done:     bool = False
    provider: Provider = "anthropic"


# --- Anthropic Provider ---

_anthropic_client: anthropic.AsyncAnthropic | None = None

def _get_anthropic() -> anthropic.AsyncAnthropic:
    """Returns a singleton instance of the Anthropic async client."""
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_KEY)
    return _anthropic_client


async def _anthropic_complete(
    system: str,
    messages: list[dict],
    max_tokens: int = 2048,
) -> ModelResponse:
    """Executes a completion request against the Anthropic API."""
    client = _get_anthropic()
    t0 = time.monotonic()

    response = await client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=max_tokens,
        system=[
            {
                "type": "text",
                "text": system,
                # Cache the system prompt to optimize costs for repeated agent calls
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=messages,
    )

    text  = response.content[0].text if response.content else ""
    usage = response.usage
    cached = getattr(usage, "cache_read_input_tokens", 0) > 0

    return ModelResponse(
        text=text,
        model=response.model,
        provider="anthropic",
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        cached=cached,
        duration_ms=int((time.monotonic() - t0) * 1000),
    )


async def _anthropic_stream(
    system: str,
    messages: list[dict],
    max_tokens: int = 2048,
) -> AsyncIterator[StreamChunk]:
    """Streams a completion response from the Anthropic API."""
    client = _get_anthropic()

    async with client.messages.stream(
        model=ANTHROPIC_MODEL,
        max_tokens=max_tokens,
        system=[
            {"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}
        ],
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield StreamChunk(text=text, provider="anthropic")

    yield StreamChunk(text="", done=True, provider="anthropic")


# --- Ollama Provider ---

async def _ollama_complete(
    system: str,
    messages: list[dict],
    max_tokens: int = 2048,
) -> ModelResponse:
    """Executes a completion request against a local Ollama instance."""
    t0 = time.monotonic()

    payload = {
        "model":    OLLAMA_MODEL,
        "messages": [{"role": "system", "content": system}, *messages],
        "stream":   False,
        "options":  {"num_predict": max_tokens},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{OLLAMA_BASE}/api/chat", json=payload)
        resp.raise_for_status()
        data = resp.json()

    return ModelResponse(
        text=data["message"]["content"],
        model=data.get("model", OLLAMA_MODEL),
        provider="ollama",
        input_tokens=data.get("prompt_eval_count", 0),
        output_tokens=data.get("eval_count", 0),
        cached=False,
        duration_ms=int((time.monotonic() - t0) * 1000),
    )


async def _ollama_stream(
    system: str,
    messages: list[dict],
    max_tokens: int = 2048,
) -> AsyncIterator[StreamChunk]:
    """Streams a completion response from a local Ollama instance."""
    payload = {
        "model":    OLLAMA_MODEL,
        "messages": [{"role": "system", "content": system}, *messages],
        "stream":   True,
        "options":  {"num_predict": max_tokens},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", f"{OLLAMA_BASE}/api/chat", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                try:
                    obj = json.loads(line)
                    content = obj.get("message", {}).get("content", "")
                    if content:
                        yield StreamChunk(text=content, provider="ollama")
                    if obj.get("done"):
                        break
                except json.JSONDecodeError:
                    pass

    yield StreamChunk(text="", done=True, provider="ollama")


async def ollama_available() -> bool:
    """Performs a health check to determine if the Ollama service is reachable."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{OLLAMA_BASE}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False


# --- Core Router ---

async def complete(
    system: str,
    messages: list[dict],
    max_tokens: int = 2048,
    prefer: Provider | None = None,
) -> ModelResponse:
    """
    Unified entry point for model completions.
    
    Priority Logic:
    1. Anthropic (if API key is present and 'prefer' is not 'ollama')
    2. Local Ollama (fallback)
    """
    use_anthropic = ANTHROPIC_KEY and prefer != "ollama"

    if use_anthropic:
        try:
            result = await _anthropic_complete(system, messages, max_tokens)
            logger.info(
                "anthropic/%s in=%d out=%d cached=%s dur=%dms",
                result.model, result.input_tokens, result.output_tokens,
                result.cached, result.duration_ms,
            )
            return result
        except anthropic.APIError as e:
            logger.warning("Anthropic failed (%s) — falling back to Ollama", e)

    logger.info("ollama/%s", OLLAMA_MODEL)
    return await _ollama_complete(system, messages, max_tokens)


async def stream(
    system: str,
    messages: list[dict],
    max_tokens: int = 2048,
    prefer: Provider | None = None,
) -> AsyncIterator[StreamChunk]:
    """
    Unified entry point for streaming model completions.
    
    Follows the same priority logic as the `complete` function.
    Yields `StreamChunk` objects until the final chunk (marked as `done=True`).
    """
    use_anthropic = ANTHROPIC_KEY and prefer != "ollama"

    if use_anthropic:
        try:
            async for chunk in _anthropic_stream(system, messages, max_tokens):
                yield chunk
            return
        except anthropic.APIError as e:
            logger.warning("Anthropic stream failed (%s) — falling back to Ollama", e)

    async for chunk in _ollama_stream(system, messages, max_tokens):
        yield chunk


def active_provider() -> dict:
    """Returns the current configuration and active status of supported providers."""
    return {
        "anthropic": {
            "configured": bool(ANTHROPIC_KEY),
            "model":      ANTHROPIC_MODEL,
        },
        "ollama": {
            "base":  OLLAMA_BASE,
            "model": OLLAMA_MODEL,
        },
        "active": "anthropic" if ANTHROPIC_KEY else "ollama",
    }


async def _smoke_test():
    """Simple internal validation to verify the router is functional."""
    logging.basicConfig(level=logging.INFO)
    result = await complete(
        system="You are a test assistant. Reply with exactly: AEGIS MODEL ROUTER OK",
        messages=[{"role": "user", "content": "ping"}],
        max_tokens=20,
    )
    print(f"Provider: {result.provider} | Model: {result.model}")
    print(f"Response: {result.text.strip()}")
    print(f"Tokens in/out: {result.input_tokens}/{result.output_tokens} | Cached: {result.cached}")


if __name__ == "__main__":
    asyncio.run(_smoke_test())
