"""Unified LLM client: provider chain fallback + tenacity retry + usage tracking.

Principles ported from Horizon's ``ai/client.py`` (ChainedAIClient) and
``ai/analyzer.py`` (tenacity retry), adapted to this project's synchronous
ThreadPoolExecutor architecture.

Layering:
- ``_call_once`` issues a single OpenAI-compatible request (no retry).
- ``_call_with_retry`` wraps it with tenacity (3 attempts, exponential backoff),
  retrying on rate-limit / 5xx / connection errors and JSON parse failures,
  but NOT on 401/4xx (raised immediately).
- ``complete`` tries the primary provider (with retry); on a *fallback-eligible*
  error it switches to the fallback provider (with its own retry). Fallback is
  lazy: a missing fallback config means single-provider behaviour, identical to
  before this module existed.
"""

from __future__ import annotations

import json
import logging
import re
import threading
from typing import Any, Optional

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    OpenAI,
    RateLimitError,
)
from pydantic import BaseModel, Field, ValidationError
from tenacity import (
    Retrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = logging.getLogger(__name__)

# Max attempts per provider. Keeps parity with the old hand-rolled retry (3).
_MAX_ATTEMPTS = 3
_BACKOFF_MIN = 2
_BACKOFF_MAX = 10


class LLMJSONError(Exception):
    """Raised when a json_mode response cannot be parsed. Triggers a retry."""


class ScoreResult(BaseModel):
    """Validated scoring output. Range-checked so a runaway LLM score degrades gracefully."""

    topic: str = "无关"
    score: int = Field(ge=0, le=10, default=0)
    tags: list[str] = Field(default_factory=list)
    keep: bool = False

    @classmethod
    def from_raw(cls, raw: dict) -> "ScoreResult":
        """Validate a raw LLM dict; on failure return a neutral (无关/0) result."""
        try:
            data = dict(raw)
        except Exception:
            data = {}
        # Normalize tags: LLM sometimes returns a comma string.
        tags = data.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        elif not isinstance(tags, list):
            tags = []
        data["tags"] = tags
        try:
            return cls.model_validate(data)
        except (ValidationError, TypeError):
            return cls()


# ── Token / cost tracking (module-level, thread-safe) ────────────────────────

_USAGE: dict[str, dict[str, int]] = {}
_usage_lock = threading.Lock()


def _record(provider: str, response: Any) -> None:
    usage = getattr(response, "usage", None)
    if not usage:
        return
    inp = getattr(usage, "prompt_tokens", 0) or 0
    out = getattr(usage, "completion_tokens", 0) or 0
    with _usage_lock:
        bucket = _USAGE.setdefault(provider, {"input": 0, "output": 0})
        bucket["input"] += inp
        bucket["output"] += out


def reset_usage() -> None:
    with _usage_lock:
        _USAGE.clear()


def get_usage() -> dict[str, int]:
    """Return flattened input/output totals across all providers."""
    with _usage_lock:
        total_in = sum(b["input"] for b in _USAGE.values())
        total_out = sum(b["output"] for b in _USAGE.values())
    return {"input": total_in, "output": total_out}


# ── Fallback eligibility (ported from Horizon _should_fallback) ───────────────

def should_fallback(exc: Exception) -> bool:
    """Whether an error warrants switching to the fallback provider."""
    if isinstance(exc, LLMJSONError):
        return False  # malformed JSON is retryable, not fallback-eligible.
    if isinstance(exc, RateLimitError):
        return True
    if isinstance(exc, APIStatusError):
        code = getattr(exc, "status_code", 0) or 0
        # Auth/quota and 5xx all warrant trying another provider.
        if code in (401, 403) or code >= 500:
            return True
        return False
    # Fallback for string-based detection (e.g. provider-specific errors that
    # wrap quota messages without a clean status code).
    msg = str(exc).lower()
    if "quota" in msg or "exceeded" in msg:
        return True
    if "service unavailable" in msg:
        return True
    return False


# ── Retryable error detection for tenacity ───────────────────────────────────

def _is_retryable_status(exc: APIStatusError) -> bool:
    return getattr(exc, "status_code", 0) >= 500


class _RetryableAPIStatus(Exception):
    """Wrapper so tenacity can match on 5xx without inspecting status codes."""


def _wrap_for_retry(exc: Exception) -> Exception:
    """Re-raise 5xx APIStatusError as a retryable sentinel; pass others through."""
    if isinstance(exc, APIStatusError) and _is_retryable_status(exc):
        return _RetryableAPIStatus(str(exc))
    return exc


# ── Client ───────────────────────────────────────────────────────────────────

class LLMClient:
    """OpenAI-compatible client with optional fallback provider.

    Construct with a config dict (from ``src.config.load_config``). If
    ``fallback_base_url`` / ``fallback_api_key`` are populated, a second
    provider is used when the primary fails with a fallback-eligible error.
    """

    def __init__(self, cfg: dict):
        self._primary = {
            "api_key": cfg["api_key"],
            "base_url": cfg["base_url"],
            "model": cfg.get("scoring_model", ""),
            "label": "primary",
        }
        fb_key = cfg.get("fallback_api_key", "") or ""
        fb_url = cfg.get("fallback_base_url", "") or ""
        fb_model = cfg.get("fallback_model", "") or ""
        self._fallback: Optional[dict] = None
        if fb_key and fb_url and fb_model:
            self._fallback = {
                "api_key": fb_key,
                "base_url": fb_url,
                "model": fb_model,
                "label": "fallback",
            }
        self._timeout = cfg.get("timeouts_llm", 60)
        max_conc = cfg.get("max_concurrency", 0) or 0
        self._sem: Optional[threading.Semaphore] = (
            threading.Semaphore(max_conc) if max_conc > 0 else None
        )

    def _provider(self, spec: dict) -> OpenAI:
        return OpenAI(api_key=spec["api_key"], base_url=spec["base_url"])

    def complete(
        self,
        prompt: str,
        *,
        model: Optional[str] = None,
        max_tokens: int = 384,
        json_mode: bool = False,
    ) -> Any:
        """Run the prompt. Returns parsed dict (json_mode) or raw str.

        Tries primary (with retry); on fallback-eligible failure, tries fallback.
        """
        providers = [self._primary]
        if self._fallback is not None:
            providers.append(self._fallback)

        last_err: Optional[Exception] = None
        for idx, spec in enumerate(providers):
            try:
                if self._sem is not None:
                    with self._sem:
                        return self._call_with_retry(
                            spec,
                            model or spec["model"],
                            prompt,
                            max_tokens=max_tokens,
                            json_mode=json_mode,
                        )
                return self._call_with_retry(
                    spec,
                    model or spec["model"],
                    prompt,
                    max_tokens=max_tokens,
                    json_mode=json_mode,
                )
            except Exception as exc:
                last_err = exc
                if idx < len(providers) - 1 and should_fallback(exc):
                    logger.warning(
                        "LLM provider %s failed (%s); falling back to %s",
                        spec["label"], exc, providers[idx + 1]["label"],
                    )
                    continue
                raise
        raise RuntimeError(f"All LLM providers failed: {last_err}")

    def _call_with_retry(
        self,
        spec: dict,
        model: str,
        prompt: str,
        *,
        max_tokens: int,
        json_mode: bool,
    ) -> Any:
        client = self._provider(spec)
        retrying = Retrying(
            stop=stop_after_attempt(_MAX_ATTEMPTS),
            wait=wait_exponential(min=_BACKOFF_MIN, max=_BACKOFF_MAX),
            retry=retry_if_exception_type(
                (RateLimitError, APIConnectionError, APITimeoutError,
                 _RetryableAPIStatus, LLMJSONError)
            ),
            reraise=True,
        )
        for attempt in retrying:
            with attempt:
                return self._call_once(client, spec, model, prompt,
                                       max_tokens=max_tokens, json_mode=json_mode)
        # Unreachable: Retrying reraises on exhaustion.
        raise RuntimeError("unreachable")

    def _call_once(
        self,
        client: OpenAI,
        spec: dict,
        model: str,
        prompt: str,
        *,
        max_tokens: int,
        json_mode: bool,
    ) -> Any:
        kwargs: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
            "timeout": self._timeout,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        try:
            response = client.chat.completions.create(**kwargs)
        except APIStatusError as exc:
            raise _wrap_for_retry(exc) from exc

        _record(spec["label"], response)

        if not response.choices:
            raise LLMJSONError("API returned empty choices list")
        raw = (response.choices[0].message.content or "").strip()
        if not raw:
            raise LLMJSONError("empty response content")

        if json_mode:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if not match:
                raise LLMJSONError(f"no JSON object in response: {raw[:200]}")
            try:
                result = json.loads(match.group())
            except json.JSONDecodeError as exc:
                raise LLMJSONError(f"JSON decode failed: {exc}") from exc
            if result is None:
                raise LLMJSONError("JSON parsed as null")
            return result
        return raw
