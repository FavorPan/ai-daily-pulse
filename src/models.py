"""Article data model.

Internal pipeline stages use the ``Article`` dataclass for type-safe field
access. Boundaries (fetch_feed return, writer input, history, tests) still
exchange plain dicts; ``Article.from_dict`` / ``Article.to_dict`` bridge the
two so no caller is forced to adopt the dataclass.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, fields


@dataclass
class Article:
    """An article flowing through the pipeline.

    Field groups by producing stage:
    - fetch:      title, url, content, source, lang, published_at
    - score:      topic, score, tags, keep
    - summarize:  summary, summary_en, why_now, why_now_en
    - trend:      trend_signal, trend_topic, trend_source_count, trend_confidence
    """

    # fetch stage
    title: str = ""
    url: str = ""
    content: str = ""
    source: str = ""
    lang: str = "en"
    published_at: str | None = None
    # score stage
    topic: str = "无关"
    score: int = 0
    tags: list[str] = field(default_factory=list)
    keep: bool = False
    # summarize stage
    summary: str = ""
    summary_en: str = ""
    why_now: str = ""
    why_now_en: str = ""
    # trend stage
    trend_signal: bool = False
    trend_topic: str = ""
    trend_source_count: int = 0
    trend_confidence: str = ""

    @staticmethod
    def _normalize_tags(tags) -> list[str]:
        """Coerce tags into a list: LLMs sometimes return a comma string."""
        if isinstance(tags, str):
            return [t.strip() for t in tags.split(",") if t.strip()]
        if isinstance(tags, list):
            return [t for t in tags if isinstance(t, str)]
        return []

    @classmethod
    def from_dict(cls, d: dict) -> "Article":
        """Build an Article from a dict, taking only known fields.

        Unknown keys are ignored so callers can pass enriched dicts without
        breaking. Tags are normalized (string -> list).
        """
        known = {f.name for f in fields(cls)}
        kwargs = {k: v for k, v in d.items() if k in known}
        if "tags" in kwargs:
            kwargs["tags"] = cls._normalize_tags(kwargs["tags"])
        return cls(**kwargs)

    def to_dict(self) -> dict:
        """Return a plain dict (all fields). Field order matches the dataclass."""
        return asdict(self)
