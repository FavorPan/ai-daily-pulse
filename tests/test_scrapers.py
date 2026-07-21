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
def test_rss_scraper_fetch_filters_by_lookback(mock_get):
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
         patch("src.scrapers.rss.feedparser.parse") as mock_parse:
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
