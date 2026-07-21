"""Tests for the Article dataclass and dict bridging."""
from src.models import Article


def test_from_dict_round_trip():
    d = {
        "title": "T", "url": "https://a.com", "content": "c", "source": "S",
        "lang": "zh", "published_at": "2026-07-20",
        "topic": "AI新技术/新模型", "score": 8, "tags": ["a", "b"], "keep": True,
        "summary": "s", "summary_en": "se", "why_now": "w", "why_now_en": "we",
        "trend_signal": True, "trend_topic": "kw", "trend_source_count": 4,
        "trend_confidence": "medium",
    }
    art = Article.from_dict(d)
    assert art.title == "T"
    assert art.score == 8
    assert art.tags == ["a", "b"]
    assert art.trend_confidence == "medium"
    out = art.to_dict()
    assert out["title"] == "T"
    assert out["tags"] == ["a", "b"]
    assert out["keep"] is True


def test_from_dict_ignores_unknown_fields():
    art = Article.from_dict({"title": "T", "extra_field": "x", "another": 1})
    assert art.title == "T"
    assert not hasattr(art, "extra_field")


def test_from_dict_normalizes_string_tags():
    art = Article.from_dict({"title": "T", "tags": "a, b, c"})
    assert art.tags == ["a", "b", "c"]


def test_from_dict_normalizes_non_list_tags():
    art = Article.from_dict({"title": "T", "tags": 123})
    assert art.tags == []


def test_defaults():
    art = Article()
    assert art.topic == "无关"
    assert art.score == 0
    assert art.tags == []
    assert art.keep is False
    assert art.lang == "en"
    assert art.trend_signal is False


def test_to_dict_writable_back_to_article():
    """to_dict output must be acceptable as from_dict input."""
    art = Article(title="T", url="https://a.com", score=7, tags=["x"])
    out = art.to_dict()
    art2 = Article.from_dict(out)
    assert art2.title == "T"
    assert art2.score == 7
    assert art2.tags == ["x"]
