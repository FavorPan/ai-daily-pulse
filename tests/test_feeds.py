from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from src.feeds import _clean_html, _extract_content, fetch_feed, _prefilter_articles


# --- _clean_html tests ---

def test_clean_html_removes_tags():
    raw = "<p>Hello <b>world</b></p>"
    assert _clean_html(raw) == "Hello world"


def test_clean_html_decodes_entities():
    raw = "a &amp; b &lt; c &#39;d&apos;e"
    result = _clean_html(raw)
    assert "&amp;" not in result
    assert "&lt;" not in result
    assert "&#39;" not in result
    assert "'" in result


def test_clean_html_merges_whitespace():
    raw = "hello    world\n\n\n\nfoo"
    result = _clean_html(raw)
    assert "    " not in result
    assert "\n\n\n\n" not in result


# --- _extract_content tests ---

def test_extract_content_prefers_content_field():
    entry = {
        "content": [{"value": "<p>Primary content here</p>"}],
        "summary": "Fallback summary",
    }
    result = _extract_content(entry)
    assert "Primary content" in result
    assert "Fallback" not in result


def test_extract_content_falls_back_to_summary():
    entry = {"summary": "<p>Summary text here</p>"}
    result = _extract_content(entry)
    assert "Summary text" in result


def test_extract_content_falls_back_to_description():
    entry = {"description": "<p>Description text</p>"}
    result = _extract_content(entry)
    assert "Description text" in result


# --- fetch_feed tests ---

@patch("src.feeds.requests.get")
def test_fetch_feed_filters_by_lookback(mock_get):
    recent = datetime.now(timezone.utc).isoformat()
    old = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()

    mock_resp = MagicMock()
    mock_resp.content = b"<rss></rss>"
    mock_resp.raise_for_status = MagicMock()
    mock_get.return_value = mock_resp

    with patch("src.feeds.feedparser.parse") as mock_parse:
        mock_parse.return_value.entries = [
            {
                "title": "Recent Article",
                "link": "https://a.com/1",
                "published": recent,
                "content": [{"value": "x" * 200}],
            },
            {
                "title": "Old Article",
                "link": "https://a.com/2",
                "published": old,
                "content": [{"value": "y" * 200}],
            },
        ]
        articles = fetch_feed({"name": "test", "url": "https://feed.com", "lang": "en"}, lookback_days=1)

    titles = [a["title"] for a in articles]
    assert "Recent Article" in titles
    assert "Old Article" not in titles


# --- _prefilter_articles tests ---

def test_prefilter_removes_short_titles():
    articles = [
        {"title": "Hi", "content": "x" * 200, "url": "https://a.com"},
        {"title": "Long enough title", "content": "y" * 200, "url": "https://b.com"},
    ]
    result = _prefilter_articles(articles)
    assert len(result) == 1
    assert result[0]["title"] == "Long enough title"


def test_prefilter_removes_short_content_without_ai_keywords():
    articles = [
        {"title": "Some news article", "content": "Short", "url": "https://a.com"},
        {"title": "AI breakthrough", "content": "Short", "url": "https://b.com"},
    ]
    result = _prefilter_articles(articles)
    assert len(result) == 1
    assert result[0]["title"] == "AI breakthrough"


def test_prefilter_keeps_short_content_with_ai_keywords():
    articles = [
        {"title": "GPT update released", "content": "Short text here", "url": "https://a.com"},
    ]
    result = _prefilter_articles(articles)
    assert len(result) == 1


def test_prefilter_keeps_quality_articles():
    articles = [
        {"title": "A detailed analysis of LLM benchmarks", "content": "x" * 200, "url": "https://a.com"},
    ]
    result = _prefilter_articles(articles)
    assert len(result) == 1


def test_prefilter_keeps_pain_point_keywords():
    """Short content with pain-point keywords should be kept."""
    articles = [
        {"title": "Solving a real struggle", "content": "Short", "url": "https://a.com"},
        {"title": "Need automation for this", "content": "Short", "url": "https://b.com"},
        {"title": "副业变现新思路", "content": "短文本", "url": "https://c.com"},
        {"title": "Nothing relevant here", "content": "Short", "url": "https://d.com"},
    ]
    result = _prefilter_articles(articles)
    titles = {a["title"] for a in result}
    assert "Solving a real struggle" in titles
    assert "Need automation for this" in titles
    assert "副业变现新思路" in titles
    assert "Nothing relevant here" not in titles
