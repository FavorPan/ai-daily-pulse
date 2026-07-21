import logging
import sys

import feedparser
import requests
from datetime import datetime, timezone, timedelta

from src.scrapers.rss import RssScraper, _clean_html, _extract_content, _parse_date

if sys.version_info >= (3, 11):
    import tomllib
else:
    import tomli as tomllib

logger = logging.getLogger(__name__)


def load_feeds(config_path: str = "feeds.toml") -> list[dict]:
    with open(config_path, "rb") as f:
        return tomllib.load(f)["feeds"]


def fetch_feed(feed: dict, lookback_days: int = 1,
               timeout: int = 60, content_cap: int = 4000) -> list[dict]:
    """
    Fetch articles from a single RSS feed published within the lookback window.
    Returns a list of article dicts with: title, url, content, source, lang, published_at.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)

    headers = {"User-Agent": "Mozilla/5.0 (compatible; ai-info-aggregator/1.0)"}
    try:
        resp = requests.get(feed["url"], headers=headers, timeout=timeout)
        resp.raise_for_status()
        parsed = feedparser.parse(resp.content)
    except Exception as e:
        logger.warning("Failed to fetch %s: %s", feed['name'], e)
        return []

    articles = []
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
            "title": entry.get("title", "").strip(),
            "url": entry.get("link", ""),
            "content": content[:content_cap],
            "source": feed["name"],
            "lang": feed["lang"],
            "published_at": published_at.isoformat() if published_at else None,
        })

    return articles


AI_KEYWORDS = {
    # ── AI 核心技术 ──
    "AI", "GPT", "LLM", "模型", "agent", "人工智能", "大模型", "机器学习",
    "深度学习", "transformer", "openai", "claude", "gemini", "deepseek",
    "ollama", "vllm", "langchain", "rag", "embedding", "fine-tune", "微调",
    "prompt", "提示词", "copilot", "midjourney", "stable diffusion", "suno",
    "whisper", "chatgpt", "cursor", "bolt", "lovable", "replit",
    "多模态", "vision", "text-to-speech", "tts", "stt", "向量",
    # ── 商业模式 / 变现 ──
    "SaaS", "ARR", "MRR", "定价", "pricing", "订阅", "subscription",
    "freemium", "付费转化", "conversion", "upsell", "churn", "留存",
    "retention", "LTV", "CAC", "ROI", "monetize", "变现", "盈利",
    "revenue", "收入", "月入", "年入", "利润", "margin", "毛利",
    "独立开发者", "indie", "solopreneur", "side project", "副业",
    # ── 增长 / 获客 ──
    "startup", "融资", "MVP", "PMF", "product-market fit", "冷启动",
    "增长", "growth", "获客", "acquisition", "SEO", "SEM",
    "内容营销", "content marketing", "newsletter", "社群", "community",
    "viral", "裂变", "referral", "推荐", "口碑",
    "Product Hunt", "launch", "发布", "首发",
    # ── 用户痛点信号 ──
    "痛点", "pain point", "frustrat", "struggle", "吐槽", "难用",
    "效率", "efficiency", "自动化", "automation", "workflow", "工作流",
    "手动", "manual", "重复", "repetitive", "繁琐", "tedious",
    "省时", "save time", "降本", "cost saving", "替代", "replace",
    "刚需", "must-have", "高频", "高频需求", "未被满足",
    "looking for", "need", "有没有", "求推荐", "怎么解决",
    # ── 产品构建 ──
    "no-code", "低代码", "API", "webhook", "集成", "integration",
    "模板", "template", "插件", "plugin", "扩展", "extension",
    "自动化工具", "bot", "机器人", "chatbot", "assistant", "助手",
    "dashboard", "仪表盘", "analytics", "数据分析", "监控",
    # ── 电商 / 独立站 ──
    "电商", "ecommerce", "Shopify", "独立站", "dropship", "选品",
    "listing", "转化率", "客单价", "复购", "私域", "DTC",
    "支付", "payment", "物流", "fulfillment", "客服", "售后",
    # ── 开源 / 技术栈 ──
    "开源", "open source", "GitHub", "repo", "star", "fork",
    "docker", "k8s", "kubernetes", "部署", "deploy", "self-host",
    "serverless", "边缘计算", "edge", "cloud", "server",
    "Python", "Rust", "Go", "TypeScript", "React", "Next.js",
    # ── 行业 / 场景 ──
    "融资", "funding", "估值", "valuation", "IPO", "上市",
    "裁员", "layoff", "招聘", "hire", "远程", "remote",
    "出海", "全球化", "global", "本地化", "localization",
    "合规", "compliance", "隐私", "privacy", "安全", "security",
}


def _prefilter_articles(articles: list[dict]) -> list[dict]:
    """Filter out obviously low-quality articles using simple rules."""
    kept = []
    filtered = 0
    for a in articles:
        title = a.get("title", "")
        content = a.get("content", "")
        if len(title) < 5:
            filtered += 1
            continue
        if len(content) < 100 and not any(kw.lower() in (title + content).lower() for kw in AI_KEYWORDS):
            filtered += 1
            continue
        kept.append(a)
    if filtered:
        logger.info("Pre-filter: removed %d low-quality article(s)", filtered)
    return kept


def fetch_all(config_path: str = "feeds.toml", lookback_days: int = 1,
              timeout: int = 60, content_cap: int = 4000, workers: int = 8,
              extract_timeout: int = 20) -> tuple[list[dict], list[dict]]:
    feeds = load_feeds(config_path)
    scraper = RssScraper(
        feeds,
        lookback_days=lookback_days,
        timeout=timeout,
        content_cap=content_cap,
        workers=workers,
        extract_timeout=extract_timeout,
    )
    articles, feed_results = scraper.fetch()
    return _prefilter_articles(articles), feed_results
