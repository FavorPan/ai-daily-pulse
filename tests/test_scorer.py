"""Tests for scorer pure functions and ScoreResult validation.

The old _call_with_retry tests moved to tests/test_llm.py (the retry logic now
lives in src.llm.LLMClient). What remains here: tokenization, Jaccard
grouping, and ScoreResult.from_raw validation.
"""
from src.scorer import _tokenize, _jaccard, _find_suspect_groups
from src.llm import ScoreResult


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


# --- ScoreResult.from_raw tests ---

def test_score_result_valid():
    r = ScoreResult.from_raw({"topic": "AI新技术/新模型", "score": 8, "tags": ["gpt"], "keep": True})
    assert r.topic == "AI新技术/新模型"
    assert r.score == 8
    assert r.tags == ["gpt"]
    assert r.keep is True


def test_score_result_tags_string_normalized():
    r = ScoreResult.from_raw({"topic": "x", "score": 5, "tags": "a, b,c", "keep": True})
    assert r.tags == ["a", "b", "c"]


def test_score_result_out_of_range_degrades():
    """A score of 11 fails validation -> neutral (无关/0) result."""
    r = ScoreResult.from_raw({"topic": "x", "score": 11, "tags": [], "keep": True})
    assert r.score == 0
    assert r.topic == "无关"
    assert r.keep is False


def test_score_result_missing_fields_degrades():
    r = ScoreResult.from_raw({})
    assert r.score == 0
    assert r.topic == "无关"
    assert r.tags == []
    assert r.keep is False


def test_score_result_non_dict_degrades():
    r = ScoreResult.from_raw("not a dict")  # type: ignore[arg-type]
    assert r.score == 0
    assert r.topic == "无关"


# --- why_now fact-check ---

from src.scorer import verify_why_now, _fact_tokens


def test_fact_tokens_extracts_numbers_and_quoted_and_proper():
    text = 'OpenAI released Claude, price cut 50%, "Project Strawberry" live'
    tokens = _fact_tokens(text)
    assert "project strawberry" in tokens
    assert any("50" in t for t in tokens)
    assert "openai" in tokens
    assert "claude" in tokens


def test_verify_why_now_passes_when_grounded():
    content = "OpenAI released GPT-5 with 50% price drop on Project Strawberry."
    why = "GPT-5 dropped prices by 50%."
    assert verify_why_now(why, content) == why


def test_verify_why_now_blanks_hallucination():
    content = "Some unrelated article about cats and dogs."
    why = "GPT-5 launched at $99 with 90% discount on Project Strawberry."
    # Most fact tokens absent from content -> blanked.
    assert verify_why_now(why, content) == ""


def test_verify_why_now_short_passes_through():
    """A why_now with <=2 fact tokens is too thin to judge; pass through."""
    content = "Unrelated content here."
    why = "刚刚发布的 API 降价了。"
    assert verify_why_now(why, content) == why


def test_verify_why_now_empty_returns_empty():
    assert verify_why_now("", "content") == ""
    assert verify_why_now("   ", "content") == ""
