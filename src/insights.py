"""
每日洞察模块：基于社区讨论热度生成构建方向 + 社媒文案。

核心逻辑：用 last30days 一次全局搜索拿到社区真实讨论数据，
反向匹配今日文章，挑出社区最关注的 2 篇，附上讨论度数据生成项目建议。
"""

import json
import logging
import os
import re
import subprocess
from collections import Counter

from openai import OpenAI

logger = logging.getLogger(__name__)

BUILD_DIRECTIONS_PROMPT = """你是一位 AI 创业顾问，面向独立开发者和一人公司创业者。

根据以下从社区讨论热度中筛选出的 AI 资讯，为每篇文章生成 1 个具体可做的项目建议。

每篇文章都附带了真实的社区讨论数据（Reddit/Hacker News），请结合社区热议点来写 why_now。

输出恰好 {n} 个项目。每个项目必须是一个可独立开发的产品（不是"做 AI 工具"这种废话）。

每个项目必须包含：
- name: 产品名
- description: 一句话描述
- target_user: 目标用户
- core_features: 核心功能列表（2-3 个）
- related_trends: 相关趋势标签（2-3 个）
- why_now: 为什么现在是好时机（引用社区讨论数据和文章信息）
- monetization: 变现模式
- difficulty: 难度（easy/medium/hard）
- estimated_mvp_days: MVP 预估天数

要求：
- 优先利用社区讨论中的真实需求信号
- 项目要具体、可落地，不是泛泛而谈
- why_now 要有时效性，引用具体的社区讨论点

今日入选文章及社区讨论数据：
{articles}

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


def _tokenize(text: str) -> set[str]:
    """Simple tokenization: extract alphanumeric + CJK tokens, keep >= 2 chars."""
    tokens = re.findall(r"[a-zA-Z0-9一-鿿]+", text.lower())
    return {t for t in tokens if len(t) >= 2}


def _build_search_query(articles: list[dict]) -> str:
    """从所有 articles 提取 trend_topic + 高频 tag，返回空格分隔的搜索词。"""
    # 1. 收集所有 trend_topic（跨源热点词，优先级最高）
    trend_topics = [a["trend_topic"] for a in articles if a.get("trend_topic")]

    # 2. 收集所有 tags，按出现频次排序
    tag_freq: Counter = Counter()
    for a in articles:
        for t in a.get("tags", []):
            tag_freq[t.lower()] += 1

    # 3. 组合：trend_topics 优先 + top 3 高频 tag
    candidates = list(dict.fromkeys(trend_topics))  # 去重保序
    candidates += [t for t, _ in tag_freq.most_common(3) if t not in candidates]

    return " ".join(candidates[:5])


def _fetch_social_pulse(query: str, cfg: dict) -> dict | None:
    """通过 subprocess 调用 last30days，返回解析后的 JSON dict，失败返回 None。"""
    engine_path = os.path.expanduser(cfg["last30days_engine_path"])
    python_path = cfg["last30days_python_path"]
    timeout = cfg["last30days_timeout"]
    search_sources = cfg["last30days_search_sources"]

    cmd = [
        python_path,
        engine_path,
        "--quick",
        "--emit=json",
        f"--search={search_sources}",
        query,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            logger.warning(
                "last30days exited with code %d: %s",
                result.returncode,
                result.stderr[:200] if result.stderr else "",
            )
            return None
        return json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        logger.warning("last30days timed out after %ds", timeout)
        return None
    except json.JSONDecodeError as e:
        logger.warning("last30days returned invalid JSON: %s", e)
        return None
    except FileNotFoundError:
        logger.warning("last30days engine not found at %s (python: %s)", engine_path, python_path)
        return None
    except Exception as e:
        logger.warning("last30days call failed: %s", e)
        return None


def _match_social_pulse(article: dict, social_result: dict) -> dict:
    """
    用关键词匹配计算一篇文章的社区讨论度。

    匹配策略：
    1. 提取文章的关键词（title 分词 + tags + trend_topic）
    2. 在社区结果中找标题包含相同关键词的条目
    3. 聚合这些条目的互动数据
    """
    article_keywords: set[str] = set()
    # 标题分词
    article_keywords.update(_tokenize(article["title"]))
    # tags
    for t in article.get("tags", []):
        article_keywords.add(t.lower())
    # trend_topic
    if article.get("trend_topic"):
        article_keywords.add(article["trend_topic"].lower())

    matched_items = []
    for source, items in social_result.get("items_by_source", {}).items():
        for item in items:
            item_keywords = _tokenize(item.get("title", ""))
            overlap = article_keywords & item_keywords
            if overlap:
                matched_items.append({
                    "source": source,
                    "title": item["title"],
                    "url": item.get("url", ""),
                    "engagement": item.get("engagement", {}),
                    "overlap_keywords": list(overlap),
                })

    # 聚合社区讨论度
    total_engagement = 0
    sources_set: set[str] = set()
    for m in matched_items:
        eng = m["engagement"]
        if isinstance(eng, dict):
            total_engagement += (
                eng.get("points", 0)
                + eng.get("score", 0)
                + eng.get("num_comments", 0)
                + eng.get("comments", 0)
            )
        sources_set.add(m["source"])

    return {
        "matched_items": matched_items[:5],
        "total_engagement": total_engagement,
        "source_count": len(sources_set),
        "community_sources": sorted(sources_set),
    }


def _pick_top_discussed(
    articles: list[dict],
    social_result: dict,
    n: int = 2,
) -> list[dict]:
    """
    按社区讨论度排序挑 top n。

    优先 total_engagement > 0 的，不足的按 RSS trend_source_count + score 补齐。
    """
    scored = []
    for a in articles:
        pulse = _match_social_pulse(a, social_result)
        scored.append((a, pulse))

    # Sort: has engagement first, then by total_engagement desc,
    # then by trend_source_count + score
    def _sort_key(item: tuple) -> tuple:
        a, pulse = item
        has_engagement = 1 if pulse["total_engagement"] > 0 else 0
        return (
            has_engagement,
            pulse["total_engagement"],
            a.get("trend_source_count", 0) + a.get("score", 0),
        )

    scored.sort(key=_sort_key, reverse=True)

    result = []
    for a, pulse in scored[:n]:
        result.append({"article": a, "social_pulse": pulse})

    return result


def generate_build_directions(
    articles: list[dict],
    client: OpenAI,
    model: str,
    cfg: dict,
) -> list[dict]:
    """
    从社区讨论热度中提炼构建方向。

    流程：
    1. 如果 last30days 启用 → 全局搜索社区讨论 → 按讨论度挑 top 2
    2. 否则 fallback 到 RSS trend_source_count + score 挑 top 2
    3. LLM 生成项目建议，附带社区讨论数据
    """
    if not articles:
        return []

    # Try social pulse if enabled
    social_result = None
    if cfg.get("last30days_enabled", False):
        query = _build_search_query(articles)
        if query:
            logger.info("Fetching social pulse for query: %s", query)
            social_result = _fetch_social_pulse(query, cfg)
            if social_result:
                source_count = len(social_result.get("items_by_source", {}))
                logger.info("Social pulse fetched: %d sources", source_count)
            else:
                logger.info("Social pulse unavailable, falling back to RSS signals")
        else:
            logger.info("No search query built, falling back to RSS signals")

    # Pick top articles
    if social_result:
        top_picks = _pick_top_discussed(articles, social_result, n=2)
    else:
        # Fallback: sort by trend_source_count + score
        sorted_articles = sorted(
            articles,
            key=lambda a: a.get("trend_source_count", 0) + a.get("score", 0),
            reverse=True,
        )
        top_picks = [
            {"article": a, "social_pulse": None} for a in sorted_articles[:2]
        ]

    if not top_picks:
        return []

    # Build prompt with article info + community data
    article_blocks = []
    for i, pick in enumerate(top_picks):
        a = pick["article"]
        pulse = pick["social_pulse"]

        block = f"文章 {i + 1}: {a.get('title', '')}\n"
        block += f"  来源: {a.get('source', '')}\n"
        block += f"  RSS 入选评分: {a.get('score', 0)}/10\n"
        block += f"  摘要: {a.get('summary', '')[:300]}\n"
        block += f"  标签: {', '.join(a.get('tags', []))}\n"
        if a.get("trend_topic"):
            block += (
                f"  跨源热点: {a['trend_topic']}"
                f" ({a.get('trend_source_count', 0)} 个源报道)\n"
            )

        if pulse and pulse.get("total_engagement", 0) > 0:
            block += f"\n  📡 社区讨论度:\n"
            for src in pulse.get("community_sources", []):
                src_items = [
                    m for m in pulse.get("matched_items", [])
                    if m["source"] == src
                ]
                block += f"    {src}: {len(src_items)} 条讨论\n"
                for item in src_items[:3]:
                    eng = item.get("engagement", {})
                    eng_str = ", ".join(
                        f"{k}: {v}" for k, v in eng.items()
                    )
                    block += (
                        f"      - {item['title'][:80]}"
                        f"{'...' if len(item['title']) > 80 else ''}"
                        f" ({eng_str})\n"
                    )
            block += (
                f"    ⚡ 综合: {pulse['total_engagement']} 互动"
                f" · 跨 {pulse['source_count']} 个平台\n"
            )

        article_blocks.append(block)

    n = len(top_picks)
    prompt = BUILD_DIRECTIONS_PROMPT.format(
        n=n,
        articles="\n\n".join(article_blocks),
    )
    result = _call_llm(client, model, prompt, max_tokens=1200)

    if not result or "projects" not in result:
        logger.warning("Build directions generation returned no result")
        return []

    directions = result["projects"]
    if not isinstance(directions, list):
        return []

    # Attach source_article and social_pulse to each project
    for i, proj in enumerate(directions):
        if i < len(top_picks):
            a = top_picks[i]["article"]
            pulse = top_picks[i]["social_pulse"]
            proj["source_article"] = a.get("title", "")
            proj["source_article_url"] = a.get("url", "")
            proj["source_article_score"] = a.get("score", 0)
            proj["source_article_source"] = a.get("source", "")
            if pulse and pulse.get("total_engagement", 0) > 0:
                proj["social_pulse"] = {
                    "total_engagement": pulse["total_engagement"],
                    "source_count": pulse["source_count"],
                    "community_sources": pulse["community_sources"],
                    "matched_items": pulse["matched_items"],
                }

    logger.info(
        "Generated %d project(s) from community discussion",
        len(directions),
    )
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

    directions = generate_build_directions(articles, client, model, cfg)
    social_post = generate_social_post(articles, client, model)
    x_thread = generate_x_thread(articles, client, model)

    return {
        "directions": directions,
        "social_post": social_post,
        "x_thread": x_thread,
    }
