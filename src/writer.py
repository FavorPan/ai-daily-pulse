import hashlib
import json
import os
from datetime import datetime, timezone

from src.file_utils import atomic_write_text


def url_to_id(url: str) -> str:
    """Stable short id for web routes from article URL."""
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]


def apply_quotas(articles: list[dict], cfg: dict | None = None) -> list[dict]:
    """Apply per-topic and total caps to balance the digest.

    - Each topic keeps at most ``digest_max_per_topic`` articles (highest score first).
    - Each topic with any articles keeps at least ``digest_min_per_topic``.
    - If total exceeds ``digest_max_total``, truncate by global score descending.
    """
    if not articles:
        return articles
    cfg = cfg or {}
    max_per = cfg.get("digest_max_per_topic", 0) or 0
    min_per = cfg.get("digest_min_per_topic", 0) or 0
    max_total = cfg.get("digest_max_total", 0) or 0

    # Group by topic, each group sorted by score desc.
    by_topic: dict[str, list[dict]] = {}
    for a in articles:
        by_topic.setdefault(a.get("topic", "未分类"), []).append(a)
    for group in by_topic.values():
        group.sort(key=lambda x: x.get("score", 0), reverse=True)

    selected: list[dict] = []
    if max_per > 0:
        for topic, group in by_topic.items():
            take = group[:max_per]
            # Guarantee the minimum if the topic had enough articles.
            if min_per > 0 and len(take) < min_per and len(group) >= min_per:
                take = group[:min_per]
            selected.extend(take)
    else:
        selected = list(articles)

    # Global total cap: keep highest-scoring across all topics.
    if max_total > 0 and len(selected) > max_total:
        selected.sort(key=lambda x: x.get("score", 0), reverse=True)
        selected = selected[:max_total]

    return selected


def build_digest_json(articles: list[dict], date: str, insights: dict | None = None) -> dict:
    """Build JSON digest for the web frontend."""
    sorted_articles = sorted(articles, key=lambda x: x["score"], reverse=True)
    items = []
    for a in sorted_articles:
        tags = a.get("tags", [])
        # Normalize: ensure tags is always a list
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        elif not isinstance(tags, list):
            tags = []
        items.append({
            "id": url_to_id(a["url"]),
            "title": a["title"],
            "summary": a.get("summary", ""),
            "score": a["score"],
            "topic": a["topic"],
            "source": a["source"],
            "url": a["url"],
            "tags": tags,
            "why_now": a.get("why_now", ""),
            "why_now_en": a.get("why_now_en", ""),
            "summary_en": a.get("summary_en", ""),
            "trend_signal": a.get("trend_signal", False),
            "trend_topic": a.get("trend_topic", ""),
            "trend_source_count": a.get("trend_source_count", 0),
            "trend_confidence": a.get("trend_confidence", ""),
        })
    highlights = [
        (it["summary"][:120] + "…") if len(it["summary"]) > 120 else it["summary"]
        for it in items[:3]
        if it["summary"]
    ]
    if not highlights:
        highlights = [it["title"] for it in items[:3]]
    result = {"date": date, "highlights": highlights, "items": items}
    if insights:
        result["directions"] = insights.get("directions", [])
    return result


def write_digest_json(
    articles: list[dict],
    output_dir: str = "output",
    date: str | None = None,
    insights: dict | None = None,
    cfg: dict | None = None,
) -> str:
    """Write digest-{date}.json and latest.json. Returns dated file path."""
    if date is None:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    articles = apply_quotas(articles, cfg)
    payload = build_digest_json(articles, date, insights)
    os.makedirs(output_dir, exist_ok=True)
    dated_path = os.path.join(output_dir, f"digest-{date}.json")
    latest_path = os.path.join(output_dir, "latest.json")
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    atomic_write_text(dated_path, text)
    atomic_write_text(latest_path, text)

    return dated_path
