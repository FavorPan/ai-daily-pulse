from src.scorer import _tokenize, _jaccard, _find_suspect_groups, _call_with_retry
import json


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


def test_call_with_retry_parses_json_from_markdown_block():
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


def test_call_with_retry_parses_bare_json():
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
