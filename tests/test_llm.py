"""Tests for src.llm.LLMClient: retry, provider-chain fallback, JSON parsing.

These replace the old tests/test_scorer.py::_call_with_retry tests. The retry
and fallback logic now lives in LLMClient. We inject fake providers via the
client_factory-style hook: LLMClient._provider is monkeypatched to return a
fake OpenAI-like client.
"""
import json
from unittest.mock import patch

import pytest
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    RateLimitError,
)

from src.llm import LLMClient, LLMJSONError, should_fallback


# --- Stub exceptions (avoid needing real httpx objects) ---

class _StubRateLimitError(RateLimitError):
    def __init__(self):
        pass


class _StubAPIStatusError(APIStatusError):
    def __init__(self, status_code: int):
        self.status_code = status_code
        self.body = None
        self.response = None
        self.message = f"HTTP {status_code}"

    def __str__(self):
        return self.message


class _StubAPIConnectionError(APIConnectionError):
    def __init__(self):
        pass


class _StubAPITimeoutError(APITimeoutError):
    def __init__(self):
        pass


# --- Fake OpenAI client building blocks ---

class FakeChoice:
    def __init__(self, content):
        self.message = type("Msg", (), {"content": content})


class FakeResponse:
    def __init__(self, content):
        self.choices = [FakeChoice(content)]
        self.usage = None


class FakeCompletions:
    def __init__(self, behavior):
        self._behavior = behavior
        self.calls = 0

    def create(self, **kwargs):
        self.calls += 1
        if callable(self._behavior):
            return self._behavior(self.calls)
        # behavior is an exception instance/class to raise always
        if isinstance(self._behavior, BaseException):
            raise self._behavior
        if isinstance(self._behavior, type) and issubclass(self._behavior, BaseException):
            raise self._behavior()
        # behavior is a string -> return as content
        return FakeResponse(self._behavior)


class FakeChat:
    def __init__(self, behavior):
        self.completions = FakeCompletions(behavior)


class FakeOpenAI:
    def __init__(self, behavior):
        self.chat = FakeChat(behavior)


def _cfg(**overrides):
    base = {
        "api_key": "k",
        "base_url": "https://primary",
        "scoring_model": "m",
        "summary_model": "m",
    }
    base.update(overrides)
    return base


def _client_with_primary(behavior, **cfg_overrides):
    """Build an LLMClient whose primary provider returns/raises `behavior`."""
    llm = LLMClient(_cfg(**cfg_overrides))
    llm._provider = lambda spec: FakeOpenAI(behavior)  # type: ignore[assignment]
    return llm


# --- should_fallback ---

def test_should_fallback_on_429():
    assert should_fallback(_StubRateLimitError()) is True


def test_should_fallback_on_5xx():
    assert should_fallback(_StubAPIStatusError(503)) is True


def test_should_fallback_on_quota():
    assert should_fallback(ValueError("quota exceeded")) is True


def test_no_fallback_on_json_error():
    assert should_fallback(LLMJSONError("bad json")) is False


def test_no_fallback_on_generic_error():
    assert should_fallback(ValueError("something else")) is False


# --- JSON parsing ---

def test_complete_parses_json_from_markdown_block():
    raw = '```json\n{"to_remove": [1, 2]}\n```'
    llm = _client_with_primary(raw)
    result = llm.complete("p", max_tokens=100, json_mode=True)
    assert result == {"to_remove": [1, 2]}


def test_complete_parses_bare_json():
    raw = '{"score": 8, "topic": "AI新技术/新模型"}'
    llm = _client_with_primary(raw)
    result = llm.complete("p", max_tokens=100, json_mode=True)
    assert result["score"] == 8


def test_complete_returns_raw_string_when_not_json_mode():
    llm = _client_with_primary("plain summary text")
    assert llm.complete("p", max_tokens=100, json_mode=False) == "plain summary text"


# --- Retry behavior (3 attempts, then reraise) ---

_NO_SLEEP = patch("tenacity.nap.sleep", lambda s: None)


@pytest.mark.parametrize("exc", [
    _StubAPIConnectionError(),
    _StubAPITimeoutError(),
    _StubRateLimitError(),
    _StubAPIStatusError(503),
])
def test_complete_retries_on_transient_then_succeeds(exc):
    def behavior(n):
        if n < 3:
            raise exc
        return FakeResponse('{"ok": true}')

    llm = _client_with_primary(behavior)
    with _NO_SLEEP:
        result = llm.complete("p", max_tokens=100, json_mode=True)
    assert result == {"ok": True}


def test_complete_raises_after_max_attempts():
    llm = _client_with_primary(_StubAPIConnectionError())
    with _NO_SLEEP:
        with pytest.raises(APIConnectionError):
            llm.complete("p", max_tokens=100, json_mode=True)


def test_complete_no_retry_on_401():
    llm = _client_with_primary(_StubAPIStatusError(401))
    with _NO_SLEEP:
        with pytest.raises(APIStatusError):
            llm.complete("p", max_tokens=100, json_mode=True)


def test_complete_no_retry_on_400():
    llm = _client_with_primary(_StubAPIStatusError(400))
    with _NO_SLEEP:
        with pytest.raises(APIStatusError):
            llm.complete("p", max_tokens=100, json_mode=True)


def test_complete_retries_on_json_parse_failure():
    """LLMJSONError is retryable; succeeds on 3rd attempt."""
    def behavior(n):
        if n < 3:
            return FakeResponse("not json at all")
        return FakeResponse('{"ok": true}')

    llm = _client_with_primary(behavior)
    with _NO_SLEEP:
        result = llm.complete("p", max_tokens=100, json_mode=True)
    assert result == {"ok": True}


# --- Provider chain fallback ---

def test_fallback_triggered_on_429():
    """Primary fails with 429 -> fallback provider succeeds."""
    cfg = _cfg(
        fallback_api_key="fb",
        fallback_base_url="https://fallback",
        fallback_model="fbm",
    )
    llm = LLMClient(cfg)
    providers = []

    def fake_provider(spec):
        providers.append(spec["base_url"])
        if spec["base_url"] == "https://primary":
            return FakeOpenAI(_StubRateLimitError())
        return FakeOpenAI('{"ok": true}')

    llm._provider = fake_provider  # type: ignore[assignment]
    with _NO_SLEEP:
        result = llm.complete("p", max_tokens=100, json_mode=True)
    assert result == {"ok": True}
    assert providers == ["https://primary", "https://fallback"]


def test_no_fallback_when_not_configured():
    """Without fallback config, a 429 just reraises."""
    llm = _client_with_primary(_StubRateLimitError())
    with _NO_SLEEP:
        with pytest.raises(RateLimitError):
            llm.complete("p", max_tokens=100, json_mode=True)


def test_401_falls_back_when_configured():
    """401 is fallback-eligible (message contains '401'); with a fallback
    provider configured, the chain should try it before surfacing the error."""
    cfg = _cfg(
        fallback_api_key="fb",
        fallback_base_url="https://fallback",
        fallback_model="fbm",
    )
    llm = LLMClient(cfg)
    providers = []

    def fake_provider(spec):
        providers.append(spec["base_url"])
        if spec["base_url"] == "https://fallback":
            return FakeOpenAI('{"ok": true}')
        return FakeOpenAI(_StubAPIStatusError(401))

    llm._provider = fake_provider  # type: ignore[assignment]
    with _NO_SLEEP:
        result = llm.complete("p", max_tokens=100, json_mode=True)
    assert result == {"ok": True}
    assert providers == ["https://primary", "https://fallback"]


# --- Usage tracking ---

def test_usage_tracking_accumulates():
    class UsageObj:
        prompt_tokens = 100
        completion_tokens = 50

    class RespWithUsage:
        def __init__(self):
            self.choices = [FakeChoice('{"ok": true}')]
            self.usage = UsageObj()

    from src import llm as llm_mod
    llm_mod.reset_usage()
    llm = _client_with_primary(lambda n: RespWithUsage())
    llm.complete("p", max_tokens=100, json_mode=True)
    usage = llm_mod.get_usage()
    assert usage["input"] == 100
    assert usage["output"] == 50


# --- Concurrency limiting (semaphore) ---

def test_semaphore_caps_in_flight_when_configured():
    """With max_concurrency=2, at most 2 complete() calls run simultaneously."""
    import threading
    import time

    peak = 0
    cur = 0
    lock = threading.Lock()

    class TrackingCompletions(FakeCompletions):
        def create(self, **kwargs):
            nonlocal peak, cur
            with lock:
                cur += 1
                peak = max(peak, cur)
            time.sleep(0.02)  # hold the slot briefly so concurrency is observable
            with lock:
                cur -= 1
            return FakeResponse('{"ok": true}')

    class TrackingOpenAI:
        def __init__(self):
            self.chat = type("C", (), {"completions": TrackingCompletions("")})()

    llm = LLMClient(_cfg(max_concurrency=2))
    llm._provider = lambda spec: TrackingOpenAI()  # type: ignore[assignment]

    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        list(ex.map(lambda _: llm.complete("p", max_tokens=100, json_mode=True), range(10)))

    assert peak <= 2, f"peak in-flight {peak} exceeded cap 2"
    assert peak >= 2, "semaphore never saturated — test may not be exercising concurrency"


def test_no_semaphore_when_max_concurrency_zero():
    """max_concurrency=0 means unlimited; _sem is None."""
    llm = LLMClient(_cfg(max_concurrency=0))
    assert llm._sem is None


def test_no_semaphore_when_unset():
    """Default config (no max_concurrency key) means unlimited."""
    llm = LLMClient(_cfg())
    assert llm._sem is None
