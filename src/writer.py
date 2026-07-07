import hashlib
import json
import os
from datetime import datetime, timezone


def url_to_id(url: str) -> str:
    """Stable short id for web routes from article URL."""
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]


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
) -> str:
    """Write digest-{date}.json and latest.json. Returns dated file path."""
    if date is None:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    payload = build_digest_json(articles, date, insights)
    os.makedirs(output_dir, exist_ok=True)
    dated_path = os.path.join(output_dir, f"digest-{date}.json")
    latest_path = os.path.join(output_dir, "latest.json")
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    with open(dated_path, "w", encoding="utf-8") as f:
        f.write(text)
    with open(latest_path, "w", encoding="utf-8") as f:
        f.write(text)

    return dated_path
