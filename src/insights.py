"""
每日洞察模块：从 7 天累积趋势中提炼构建方向 + 社媒文案。

核心逻辑：不是看今天热什么，而是看什么主题连续 7 天都在出现。
连续命中 = 真需求，不是一日游。
"""

import json
import logging
import os
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from openai import OpenAI

logger = logging.getLogger(__name__)

BUILD_DIRECTIONS_PROMPT = """你是一位 AI 创业顾问，面向独立开发者和一人公司创业者。

根据以下「过去 7 天持续出现的 AI 趋势」，提炼构建方向建议。

这些趋势不是今天的一时热点，而是在过去一周内反复出现、被多个信源报道的主题。
这意味着市场需求已经形成，不是昙花一现。

输出恰好 2 个具体可做的项目。每个项目必须是一个可独立开发的产品（不是"做 AI 工具"这种废话）。

每个项目必须包含：
- name: 产品名
- description: 一句话描述
- target_user: 目标用户
- core_features: 核心功能列表（2-3 个）
- related_trends: 相关趋势标签
- why_now: 为什么现在是好时机（引用趋势天数和源数）
- monetization: 变现模式
- difficulty: 难度（easy/medium/hard）
- estimated_mvp_days: MVP 预估天数

要求：
- 优先从趋势信号中找交叉点（多个趋势叠加 = 更强信号）
- 参考代表文章中的具体产品/技术

过去 7 天持续趋势：
{trends}

按以下 JSON 格式输出：
{{"projects": [{{"name": "...", "description": "...", "target_user": "...", "core_features": ["..."], "related_trends": ["..."], "why_now": "...", "monetization": "...", "difficulty": "...", "estimated_mvp_days": N}}]}}
只输出 JSON，不要其他文字。"""


SOCIAL_POST_PROMPT = """你是一位 AI 内容运营专家。根据今日 AI 日报，生成一条 X/Twitter 发帖文案。

要求：
- 中文版 + 英文版各一条
- 每条 280 字符以内
- 包含 2-3 个今日最重磅的 AI 新闻亮点
- 用 emoji 增加可读性
- 末尾加 2-3 个相关 hashtag
- 风格：信息密度高、有洞察感、不要太营销

今日 AI 日报摘要：
{summary}

按以下 JSON 格式输出：
{{"zh": "中文文案", "en": "English post"}}
只输出 JSON，不要其他文字。"""


X_THREAD_PROMPT = """你是一位 AI 内容运营专家。根据今日 AI 日报，生成一条 X/Twitter thread（3-5 条推文）。

要求：
- 每条推文 280 字符以内
- 第 1 条：hook — 今日最重磅的 AI 新闻
- 第 2-4 条：每条一个亮点，带具体数据或产品名
- 最后 1 条：总结洞察 + CTA（关注/订阅）
- 用 emoji 增加可读性
- 每条末尾加相关 hashtag

今日 top 文章（按评分排序）：
{articles}

按以下 JSON 格式输出：
{{"tweets": ["第1条推文", "第2条推文", ...]}}
只输出 JSON，不要其他文字。"""


def _call_llm(client: OpenAI, model: str, prompt: str, max_tokens: int = 1000) -> dict | None:
    """Call LLM with JSON mode, return parsed dict or None."""
    try:
        response = client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        raw = (response.choices[0].message.content or "").strip()
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.warning("Insights LLM call failed: %s", e)
    return None


def _load_historical_digests(output_dir: str = "output", days: int = 7) -> list[dict]:
    """Load the last N days of digest JSON files."""
    digests = []
    today = datetime.now(timezone.utc).date()

    for i in range(days):
        date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        path = os.path.join(output_dir, f"digest-{date}.json")
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    digests.append(json.load(f))
            except Exception as e:
                logger.warning("Failed to load %s: %s", path, e)

    return digests


def _analyze_trends(digests: list[dict], min_days: int = 3) -> list[dict]:
    """
    分析过去 N 天的 digest，找出跨天持续出现的趋势。

    逻辑：
    1. 收集每天的 LLM 标签
    2. 统计每个标签在多少个不同天出现
    3. 筛选出出现 >= min_days 天的标签
    4. 收集这些标签对应的所有文章

    Returns: list of trend dicts with tag, days, sources, articles
    """
    # tag -> {days: set(), sources: set(), articles: []}
    tag_data: dict[str, dict] = defaultdict(lambda: {"days": set(), "sources": set(), "articles": []})

    for digest in digests:
        date = digest.get("date", "")
        for item in digest.get("items", []):
            tags = item.get("tags", [])
            source = item.get("source", "")
            for tag in tags:
                tag_clean = tag.strip().lower()
                if len(tag_clean) >= 2:
                    tag_data[tag_clean]["days"].add(date)
                    tag_data[tag_clean]["sources"].add(source)
                    tag_data[tag_clean]["articles"].append(item)

    # Filter to sustained trends
    trends = []
    for tag, data in tag_data.items():
        if len(data["days"]) >= min_days:
            trends.append({
                "tag": tag,
                "days_count": len(data["days"]),
                "sources_count": len(data["sources"]),
                "sources": sorted(data["sources"]),
                "articles": sorted(data["articles"], key=lambda x: x.get("score", 0), reverse=True)[:5],
            })

    # Sort by signal strength (days * sources)
    trends.sort(key=lambda x: x["days_count"] * x["sources_count"], reverse=True)
    return trends


def generate_build_directions(
    articles: list[dict],
    client: OpenAI,
    model: str,
    output_dir: str = "output",
) -> list[dict]:
    """
    从 7 天累积趋势中提炼构建方向。

    不是看今天热什么，而是看什么主题连续 7 天都在出现。
    """
    digests = _load_historical_digests(output_dir, days=7)
    if not digests:
        logger.warning("No historical digests found, falling back to today's articles")
        top = sorted(articles, key=lambda x: x.get("score", 0), reverse=True)[:10]
        trends_text = "\n\n".join(
            f"[{a.get('score', 0)}分] {a.get('title', '')} ({a.get('source', '')})\n{a.get('summary', '')[:200]}"
            for a in top
        )
    else:
        trends = _analyze_trends(digests, min_days=7)
        if not trends:
            logger.info("No sustained trends found (need 7+ days)")
            return []

        logger.info("Found %d sustained trend(s) over 7 days:", len(trends))
        for t in trends[:5]:
            logger.info("  '%s' — %d days, %d sources", t["tag"], t["days_count"], t["sources_count"])

        # Format top trends for prompt
        trend_blocks = []
        for t in trends[:8]:  # top 8 trends
            articles_text = "\n".join(
                f"  - [{a.get('score', 0)}分] {a.get('title', '')} ({a.get('source', '')})"
                for a in t["articles"]
            )
            trend_blocks.append(
                f"趋势: {t['tag']}\n"
                f"持续天数: {t['days_count']}天\n"
                f"涉及源: {t['sources_count']}个 ({', '.join(t['sources'][:5])})\n"
                f"代表文章:\n{articles_text}"
            )
        trends_text = "\n\n".join(trend_blocks)

    prompt = BUILD_DIRECTIONS_PROMPT.format(trends=trends_text)
    result = _call_llm(client, model, prompt, max_tokens=800)

    if not result or "projects" not in result:
        logger.warning("Build directions generation returned no result")
        return []

    directions = result["projects"]
    if not isinstance(directions, list):
        return []

    logger.info("Generated %d project(s) from 7-day trends", len(directions))
    return directions


def generate_social_post(articles: list[dict], client: OpenAI, model: str) -> dict:
    """生成社交媒体发帖文案。"""
    top = sorted(articles, key=lambda x: x.get("score", 0), reverse=True)[:8]
    summary = "\n".join(
        f"- {a.get('title', '')} ({a.get('source', '')}): {a.get('summary', '')[:100]}"
        for a in top
    )

    prompt = SOCIAL_POST_PROMPT.format(summary=summary)
    result = _call_llm(client, model, prompt, max_tokens=500)

    if not result:
        return {"zh": "", "en": ""}

    return {
        "zh": result.get("zh", ""),
        "en": result.get("en", ""),
    }


def generate_x_thread(articles: list[dict], client: OpenAI, model: str) -> list[str]:
    """生成 X/Twitter thread（3-5 条推文）。"""
    top = sorted(articles, key=lambda x: x.get("score", 0), reverse=True)[:10]
    article_text = "\n".join(
        f"- [{a.get('score', 0)}分] {a.get('title', '')} — {a.get('source', '')}"
        for a in top
    )

    prompt = X_THREAD_PROMPT.format(articles=article_text)
    result = _call_llm(client, model, prompt, max_tokens=800)

    if not result or "tweets" not in result:
        return []

    tweets = result["tweets"]
    if not isinstance(tweets, list):
        return []

    logger.info("Generated X thread with %d tweet(s)", len(tweets))
    return tweets


def generate_all_insights(articles: list[dict], api_key: str, cfg: dict) -> dict:
    """Generate all insights: build directions, social post, and X thread."""
    client = OpenAI(api_key=api_key, base_url=cfg["base_url"])
    model = cfg["summary_model"]

    directions = generate_build_directions(articles, client, model)
    social_post = generate_social_post(articles, client, model)
    x_thread = generate_x_thread(articles, client, model)

    return {
        "directions": directions,
        "social_post": social_post,
        "x_thread": x_thread,
    }
