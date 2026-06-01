import hashlib
import json
import os
from collections import defaultdict
from datetime import datetime, timezone

TOPIC_ORDER = [
    "OPC/AI赚钱案例",
    "AI+电商",
    "AI工具实操/Agent工作流",
    "AI新技术/新模型",
    "AI投融资动态",
    "AI对行业的冲击",
]


def generate_markdown(articles: list[dict], date: str) -> str:
    """
    Generate a daily digest Markdown string.
    Articles are grouped by topic, sorted by score descending within each group.
    """
    by_topic = defaultdict(list)
    for a in articles:
        by_topic[a["topic"]].append(a)

    lines = [
        "---",
        f"date: {date}",
        "tags: [ai-daily]",
        "---",
        "",
    ]

    has_content = False
    for topic in TOPIC_ORDER:
        group = by_topic.get(topic)
        if not group:
            continue
        has_content = True
        group.sort(key=lambda x: x["score"], reverse=True)

        lines.append(f"## {topic}")
        lines.append("")

        for a in group:
            tags_str = " ".join(f"`#{t}`" for t in a.get("tags", []))
            lines.append(f"### [{a['title']}]({a['url']})")
            lines.append(f"- **来源**：{a['source']}")
            lines.append(f"- **评分**：{a['score']}/10")
            if tags_str:
                lines.append(f"- **标签**：{tags_str}")
            if a.get("summary"):
                lines.append(f"- **摘要**：{a['summary']}")
            if a.get("summary_en"):
                lines.append(f"- **Summary (EN)**：{a['summary_en']}")
            if a.get("why_now"):
                lines.append(f"- **为什么是现在**：{a['why_now']}")
            if a.get("trend_signal"):
                conf_map = {"high": "🔥🔥🔥", "medium": "🔥🔥", "low": "🔥"}
                icon = conf_map.get(a.get("trend_confidence", ""), "🔥")
                lines.append(f"- **{icon} 跨源热点**：\"{a['trend_topic']}\"（{a['trend_source_count']} 个源同时报道，置信度: {a.get('trend_confidence', 'N/A')}）")
            lines.append("")
            lines.append("---")
            lines.append("")

    if not has_content:
        lines.append("_今日暂无符合标准的内容。_")

    return "\n".join(lines)


def write_output(articles: list[dict], output_dir: str = "output") -> str:
    """Write the daily digest to output_dir/AI Daily - YYYY-MM-DD.md. Returns file path."""
    import os
    date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    content = generate_markdown(articles, date)

    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, f"AI Daily - {date}.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    return path


def url_to_id(url: str) -> str:
    """Stable short id for web routes from article URL."""
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]


def build_digest_json(articles: list[dict], date: str) -> dict:
    """Build JSON digest for the web frontend."""
    sorted_articles = sorted(articles, key=lambda x: x["score"], reverse=True)
    items = []
    for a in sorted_articles:
        items.append({
            "id": url_to_id(a["url"]),
            "title": a["title"],
            "summary": a.get("summary", ""),
            "score": a["score"],
            "topic": a["topic"],
            "source": a["source"],
            "url": a["url"],
            "tags": a.get("tags", []),
            "why_now": a.get("why_now", ""),
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
    return {"date": date, "highlights": highlights, "items": items}


def write_digest_json(
    articles: list[dict],
    output_dir: str = "output",
    date: str | None = None,
) -> str:
    """Write digest-{date}.json and latest.json. Returns dated file path."""
    if date is None:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    payload = build_digest_json(articles, date)
    os.makedirs(output_dir, exist_ok=True)
    dated_path = os.path.join(output_dir, f"digest-{date}.json")
    latest_path = os.path.join(output_dir, "latest.json")
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    with open(dated_path, "w", encoding="utf-8") as f:
        f.write(text)
    with open(latest_path, "w", encoding="utf-8") as f:
        f.write(text)
    return dated_path

