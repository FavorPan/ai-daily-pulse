"""Base scraper contract.

Each source type implements ``fetch() -> list[dict]`` returning article dicts
(the dict shape consumed by the rest of the pipeline). This mirrors Horizon's
``BaseScraper`` contract but stays synchronous to match this project's
ThreadPoolExecutor architecture.
"""

from __future__ import annotations


class BaseScraper:
    """Base class for all source scrapers."""

    def __init__(self, config: dict | None = None):
        self.config = config or {}

    def fetch(self) -> list[dict]:
        """Return a list of article dicts. Subclasses must implement."""
        raise NotImplementedError
