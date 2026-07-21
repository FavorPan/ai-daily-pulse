"""Tests for the RssScraper and BaseScraper contract."""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from src.scrapers import BaseScraper, RssScraper


def test_base_scraper_fetch_not_implemented():
    s = BaseScraper()
    try:
        s.fetch()
        assert False, "expected NotImplementedError"
    except NotImplementedError:
        pass


def test_base_scraper_config_default():
    assert BaseScraper().config == {}
    assert BaseScraper({"k": "v"}).config == {"k": "v"}


@patch("src.scrapers.rss.requests.get")
@patch("src.scrapers.rss.extract_fulltext", return_value="")
def test_rss_scraper_fetch_filters_by_lookback(_mock_extract, mock_get):
    recent = datetime.now(timezone.utc).isoformat()
    old = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()

    mock_resp = MagicMock()
    mock_resp.content = b"<rss></rss>"
    mock_resp.raise_for_status = MagicMock()
    mock_get.return_value = mock_resp

    with patch("src.scrapers.rss.feedparser.parse") as mock_parse:
        mock_parse.return_value.entries = [
            {"title": "Recent", "link": "https://a.com/1",
             "published": recent, "content": [{"value": "x" * 200}]},
            {"title": "Old", "link": "https://a.com/2",
             "published": old, "content": [{"value": "y" * 200}]},
        ]
        scraper = RssScraper(
            [{"name": "test", "url": "https://feed.com", "lang": "en"}],
            lookback_days=1,
        )
        articles, feed_results = scraper.fetch()

    titles = [a["title"] for a in articles]
    assert "Recent" in titles
    assert "Old" not in titles
    assert len(feed_results) == 1
    assert feed_results[0]["success"] is True
    assert feed_results[0]["count"] == 1


@patch("src.scrapers.rss.requests.get")
def test_rss_scraper_records_failed_feed(mock_get):
    mock_get.side_effect = Exception("network down")
    scraper = RssScraper(
        [{"name": "broken", "url": "https://feed.com", "lang": "en"}],
        lookback_days=1,
    )
    articles, feed_results = scraper.fetch()
    assert articles == []
    assert feed_results[0]["success"] is False
    assert feed_results[0]["count"] == 0
    assert "network down" in feed_results[0]["error"]


def test_rss_scraper_article_shape():
    """Fetched articles must carry the 6 fields the pipeline expects."""
    mock_resp = MagicMock()
    mock_resp.content = b"<rss></rss>"
    mock_resp.raise_for_status = MagicMock()
    with patch("src.scrapers.rss.requests.get", return_value=mock_resp), \
         patch("src.scrapers.rss.feedparser.parse") as mock_parse, \
         patch("src.scrapers.rss.extract_fulltext", return_value=""):
        mock_parse.return_value.entries = [
            {"title": "T", "link": "https://a.com/1",
             "content": [{"value": "x" * 200}]},
        ]
        scraper = RssScraper(
            [{"name": "test", "url": "https://feed.com", "lang": "zh"}],
            lookback_days=1,
        )
        articles, _ = scraper.fetch()
    a = articles[0]
    for key in ("title", "url", "content", "source", "lang", "published_at"):
        assert key in a
    assert a["source"] == "test"
    assert a["lang"] == "zh"


# --- Full-text extraction (trafilatura) ---

def test_extract_fulltext_returns_empty_when_url_empty():
    from src.scrapers.rss import extract_fulltext
    assert extract_fulltext("") == ""


def test_extract_fulltext_returns_empty_on_trafilatura_missing(monkeypatch):
    """If trafilatura import fails, extract_fulltext degrades to ''."""
    import builtins
    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "trafilatura":
            raise ImportError("not installed")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    from src.scrapers.rss import extract_fulltext
    assert extract_fulltext("https://example.com/a") == ""


def test_extract_fulltext_uses_trafilatura(monkeypatch):
    fake_mod = type("M", (), {})()
    fake_mod.fetch_url = lambda url: "<html>raw</html>"
    fake_mod.extract = lambda html, **kw: "extracted body text"
    import sys
    monkeypatch.setitem(sys.modules, "trafilatura", fake_mod)
    from src.scrapers.rss import extract_fulltext
    assert extract_fulltext("https://example.com/a") == "extracted body text"


@patch("src.scrapers.rss.requests.get")
@patch("src.scrapers.rss.extract_fulltext")
def test_rss_scraper_triggers_fulltext_when_content_thin(mock_extract, mock_get):
    """Thin RSS content (<400 chars) triggers full-text extraction."""
    mock_resp = MagicMock()
    mock_resp.content = b"<rss></rss>"
    mock_resp.raise_for_status = MagicMock()
    mock_get.return_value = mock_resp
    mock_extract.return_value = "full article body " * 30  # >400 chars

    with patch("src.scrapers.rss.feedparser.parse") as mock_parse:
        mock_parse.return_value.entries = [
            {"title": "Thin", "link": "https://a.com/1",
             "content": [{"value": "short"}]},  # <400 chars
        ]
        scraper = RssScraper(
            [{"name": "test", "url": "https://feed.com", "lang": "en"}],
            lookback_days=1,
        )
        articles, _ = scraper.fetch()

    mock_extract.assert_called_once_with("https://a.com/1", timeout=20)
    assert articles[0]["content"].startswith("full article body")


@patch("src.scrapers.rss.requests.get")
@patch("src.scrapers.rss.extract_fulltext")
def test_rss_scraper_skips_fulltext_when_content_rich(mock_extract, mock_get):
    """Rich RSS content (>=400 chars) does NOT trigger extraction."""
    mock_resp = MagicMock()
    mock_resp.content = b"<rss></rss>"
    mock_resp.raise_for_status = MagicMock()
    mock_get.return_value = mock_resp

    rich_content = "x" * 500
    with patch("src.scrapers.rss.feedparser.parse") as mock_parse:
        mock_parse.return_value.entries = [
            {"title": "Rich", "link": "https://a.com/1",
             "content": [{"value": rich_content}]},
        ]
        scraper = RssScraper(
            [{"name": "test", "url": "https://feed.com", "lang": "en"}],
            lookback_days=1,
        )
        articles, _ = scraper.fetch()

    mock_extract.assert_not_called()
    assert articles[0]["content"] == rich_content
