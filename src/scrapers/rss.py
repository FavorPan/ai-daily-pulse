"""RSS scraper built on the BaseScraper contract.

The low-level helpers (``_clean_html``, ``_extract_content``, ``_parse_date``)
remain in ``src.feeds`` because tests import them directly and the pre-filter
is a pipeline concern, not a source concern. This scraper orchestrates
concurrent fetching of multiple feeds and returns article dicts.
"""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone

import feedparser
import requests
from dateutil import parser as dateparser
from typing import Optional

from src.scrapers.base import BaseScraper

logger = logging.getLogger(__name__)


def _parse_date(entry) -> Optional[datetime]:
    for field in ("published", "updated", "created"):
        raw = entry.get(field)
        if raw:
            try:
                dt = dateparser.parse(raw)
                if dt and dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except Exception:
                continue
    return None


def _clean_html(raw: str) -> str:
    import html
    import re
    text = re.sub(r"<[^>]+>", " ", raw)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_content(entry) -> str:
    if entry.get("content"):
        raw = entry["content"][0].get("value", "")
    else:
        raw = entry.get("summary", "") or entry.get("description", "")
    return _clean_html(raw)


class RssScraper(BaseScraper):
    """Fetch articles from a list of RSS feeds within a lookback window."""

    def __init__(
        self,
        feeds: list[dict],
        lookback_days: int = 1,
        timeout: int = 60,
        content_cap: int = 4000,
        workers: int = 8,
    ):
        super().__init__({
            "feeds": feeds,
            "lookback_days": lookback_days,
            "timeout": timeout,
            "content_cap": content_cap,
            "workers": workers,
        })
        self.feeds = feeds
        self.lookback_days = lookback_days
        self.timeout = timeout
        self.content_cap = content_cap
        self.workers = workers

    def fetch(self) -> tuple[list[dict], list[dict]]:
        """Fetch all feeds concurrently.

        Returns ``(articles, feed_results)`` where feed_results carries
        per-feed success/count for health tracking.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=self.lookback_days)
        all_articles: list[dict] = []
        feed_results: list[dict] = []

        with ThreadPoolExecutor(max_workers=self.workers) as executor:
            future_to_feed = {
                executor.submit(self._fetch_one, feed, cutoff): feed
                for feed in self.feeds
            }
            for future in as_completed(future_to_feed):
                feed = future_to_feed[future]
                try:
                    articles = future.result()
                    logger.info("  %s: %d articles", feed["name"], len(articles))
                    all_articles.extend(articles)
                    feed_results.append(
                        {"name": feed["name"], "success": True, "count": len(articles)}
                    )
                except Exception as e:
                    logger.warning("  %s: %s", feed["name"], e)
                    feed_results.append(
                        {"name": feed["name"], "success": False, "count": 0, "error": str(e)}
                    )

        return all_articles, feed_results

    def _fetch_one(self, feed: dict, cutoff: datetime) -> list[dict]:
        """Fetch a single feed, filtering entries older than ``cutoff``."""
        headers = {"User-Agent": "Mozilla/5.0 (compatible; ai-info-aggregator/1.0)"}
        resp = requests.get(feed["url"], headers=headers, timeout=self.timeout)
        resp.raise_for_status()
        parsed = feedparser.parse(resp.content)

        articles: list[dict] = []
        for entry in parsed.entries:
            published_at = _parse_date(entry)
            if published_at and published_at < cutoff:
                continue

            content = _extract_content(entry)
            title = entry.get("title", "").strip()
            if not content or len(content.strip()) < 100:
                if title:
                    content = title
                else:
                    continue

            articles.append({
                "title": title,
                "url": entry.get("link", ""),
                "content": content[:self.content_cap],
                "source": feed["name"],
                "lang": feed["lang"],
                "published_at": published_at.isoformat() if published_at else None,
            })

        return articles
