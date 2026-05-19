from src.scorer import _tokenize, _jaccard, _find_suspect_groups, _call_with_retry
from unittest.mock import patch
import json
from openai import RateLimitError, APIStatusError, APIConnectionError, APITimeoutError


# --- Stub exception classes (avoid needing real httpx objects) ---

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


# --- _tokenize tests ---

def test_tokenize_chinese_per_char():
    tokens = _tokenize("大模型发布")
    assert "大" in tokens
    assert "模" in tokens
    assert "型" in tokens


def test_tokenize_english_space_split():
    tokens = _tokenize("OpenAI releases GPT")
    assert "openai" in tokens
    assert "releases" in tokens
    assert "gpt" in tokens


def test_tokenize_mixed():
    tokens = _tokenize("OpenAI 发布 GPT-5")
    assert "openai" in tokens
    assert "发" in tokens
    assert "布" in tokens


# --- _jaccard tests ---

def test_jaccard_identical():
    assert _jaccard({"a", "b"}, {"a", "b"}) == 1.0


def test_jaccard_disjoint():
    assert _jaccard({"a"}, {"b"}) == 0.0


def test_jaccard_partial():
    result = _jaccard({"a", "b", "c"}, {"b", "c", "d"})
    assert abs(result - 0.5) < 1e-9


def test_jaccard_empty():
    assert _jaccard(set(), set()) == 0.0


# --- _find_suspect_groups tests ---

def test_find_suspect_groups_finds_similar():
    articles = [
        {"title": "GPT-5 发布了"},
        {"title": "GPT-5 正式发布"},
        {"title": "完全不同的文章标题"},
    ]
    groups = _find_suspect_groups(articles, threshold=0.4)
    assert len(groups) == 1
    assert 0 in groups[0] and 1 in groups[0]
    assert 2 not in groups[0]


def test_find_suspect_groups_no_duplicates():
    articles = [
        {"title": "Alpha Beta Gamma"},
        {"title": "Delta Epsilon Zeta"},
        {"title": "Eta Theta Iota"},
    ]
    groups = _find_suspect_groups(articles, threshold=0.4)
    assert groups == []


def test_find_suspect_groups_empty():
    assert _find_suspect_groups([], threshold=0.4) == []


# --- _call_with_retry JSON parsing tests ---

class FakeChoice:
    def __init__(self, content):
        self.message = type("Msg", (), {"content": content})


class FakeResponse:
    def __init__(self, content):
        self.choices = [FakeChoice(content)]
        self.usage = None


@patch("src.scorer.time.sleep")
def test_call_with_retry_parses_json_from_markdown_block(mock_sleep):
    """Simulate LLM returning JSON wrapped in markdown code fence."""
    raw = '```json\n{"to_remove": [1, 2]}\n```'
    response = FakeResponse(raw)

    class FakeClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    return response

    result = _call_with_retry(FakeClient(), "m", "p", 100, json_mode=True)
    assert result == {"to_remove": [1, 2]}


@patch("src.scorer.time.sleep")
def test_call_with_retry_parses_bare_json(mock_sleep):
    raw = '{"score": 8, "topic": "AI新技术/新模型"}'
    response = FakeResponse(raw)

    class FakeClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    return response

    result = _call_with_retry(FakeClient(), "m", "p", 100, json_mode=True)
    assert result["score"] == 8


@patch("src.scorer.time.sleep")
def test_call_with_retry_retries_on_connection_error(mock_sleep):
    """Should retry on APIConnectionError with exponential backoff."""
    call_count = 0

    class FlakyClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    nonlocal call_count
                    call_count += 1
                    if call_count < 3:
                        raise _StubAPIConnectionError()
                    return FakeResponse('{"ok": true}')

    result = _call_with_retry(FlakyClient(), "m", "p", 100, json_mode=True)
    assert result == {"ok": True}
    assert call_count == 3
    assert mock_sleep.call_count == 2
    mock_sleep.assert_any_call(2)
    mock_sleep.assert_any_call(4)


@patch("src.scorer.time.sleep")
def test_call_with_retry_retries_on_timeout(mock_sleep):
    """Should retry on APITimeoutError with exponential backoff."""
    call_count = 0

    class FlakyClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    nonlocal call_count
                    call_count += 1
                    if call_count < 3:
                        raise _StubAPITimeoutError()
                    return FakeResponse('{"ok": true}')

    result = _call_with_retry(FlakyClient(), "m", "p", 100, json_mode=True)
    assert result == {"ok": True}
    assert call_count == 3
    assert mock_sleep.call_count == 2
    mock_sleep.assert_any_call(2)
    mock_sleep.assert_any_call(4)


@patch("src.scorer.time.sleep")
def test_call_with_retry_retries_on_429(mock_sleep):
    """Should retry on RateLimitError (429) with exponential backoff."""
    call_count = 0

    class FlakyClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    nonlocal call_count
                    call_count += 1
                    if call_count < 3:
                        raise _StubRateLimitError()
                    return FakeResponse('{"ok": true}')

    result = _call_with_retry(FlakyClient(), "m", "p", 100, json_mode=True)
    assert result == {"ok": True}
    assert call_count == 3
    assert mock_sleep.call_count == 2
    mock_sleep.assert_any_call(2)
    mock_sleep.assert_any_call(4)


@patch("src.scorer.time.sleep")
def test_call_with_retry_retries_on_5xx(mock_sleep):
    """Should retry on 5xx APIStatusError with exponential backoff."""
    call_count = 0

    class FlakyClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    nonlocal call_count
                    call_count += 1
                    if call_count < 3:
                        raise _StubAPIStatusError(503)
                    return FakeResponse('{"ok": true}')

    result = _call_with_retry(FlakyClient(), "m", "p", 100, json_mode=True)
    assert result == {"ok": True}
    assert call_count == 3
    assert mock_sleep.call_count == 2


@patch("src.scorer.time.sleep")
def test_call_with_retry_raises_on_401(mock_sleep):
    """Should NOT retry on 401 (auth error), raise immediately."""

    class AuthFailClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    raise _StubAPIStatusError(401)

    try:
        _call_with_retry(AuthFailClient(), "m", "p", 100, json_mode=True)
        assert False, "Expected exception"
    except _StubAPIStatusError as e:
        assert e.status_code == 401
    assert mock_sleep.call_count == 0


@patch("src.scorer.time.sleep")
def test_call_with_retry_raises_on_4xx(mock_sleep):
    """Should NOT retry on 4xx client errors (e.g. 400), raise immediately."""

    class ClientFailClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    raise _StubAPIStatusError(400)

    try:
        _call_with_retry(ClientFailClient(), "m", "p", 100, json_mode=True)
        assert False, "Expected exception"
    except _StubAPIStatusError as e:
        assert e.status_code == 400
    assert mock_sleep.call_count == 0


@patch("src.scorer.time.sleep")
def test_call_with_retry_raises_after_max_attempts(mock_sleep):
    """Should raise after 3 failed attempts."""
    class FailClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    raise _StubAPIConnectionError()

    try:
        _call_with_retry(FailClient(), "m", "p", 100, json_mode=True)
        assert False, "Expected exception"
    except _StubAPIConnectionError:
        pass
    assert mock_sleep.call_count == 2  # sleeps between attempts 1-2 and 2-3
