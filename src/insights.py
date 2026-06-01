"""
每日洞察模块：从 top 文章中提炼构建方向和社媒文案。

两个功能：
1. generate_build_directions() — 从 top 文章提炼 1-2 个 OPC 构建方向
2. generate_social_post() — 生成 X/Twitter 发帖文案（中英双版本）
"""

import json
import logging
import re
from openai import OpenAI

logger = logging.getLogger(__name__)

BUILD_DIRECTIONS_PROMPT = """你是一位 AI 创业顾问，面向独立开发者和一人公司创业者。

根据以下今日 AI 热点文章，提炼 1-2 个具体的「构建方向」建议。

每个建议必须包含：
- direction: 一句话描述要做什么产品/工具（20字以内）
- why_now: 为什么现在是好时机（具体事件/数据）
- evidence: 支撑这个判断的 1-2 篇文章标题
- difficulty: 难度（easy/medium/hard）
- monetization: 一句话变现思路

要求：
- 必须是具体的、可执行的建议，不是泛泛的"做 AI 工具"
- 优先选择有明确市场需求信号的方向
- 参考文章中的具体数据和事件

今日 top 文章：
{articles}

按以下 JSON 格式输出：
{{"directions": [{{"direction": "...", "why_now": "...", "evidence": ["..."], "difficulty": "...", "monetization": "..."}}]}}
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


def generate_build_directions(articles: list[dict], client: OpenAI, model: str) -> list[dict]:
    """
    从 top 文章中提炼 1-2 个构建方向建议。

    Returns: list of dicts with keys: direction, why_now, evidence, difficulty, monetization
    """
    # 取 top 10 文章作为输入
    top = sorted(articles, key=lambda x: x.get("score", 0), reverse=True)[:10]
    article_text = "\n\n".join(
        f"[{a.get('score', 0)}分] {a.get('title', '')} ({a.get('source', '')})\n{a.get('summary', '')[:200]}"
        for a in top
    )

    prompt = BUILD_DIRECTIONS_PROMPT.format(articles=article_text)
    result = _call_llm(client, model, prompt, max_tokens=800)

    if not result or "directions" not in result:
        logger.warning("Build directions generation returned no result")
        return []

    directions = result["directions"]
    if not isinstance(directions, list):
        return []

    logger.info("Generated %d build direction(s)", len(directions))
    return directions


def generate_social_post(articles: list[dict], client: OpenAI, model: str) -> dict:
    """
    生成社交媒体发帖文案。

    Returns: dict with keys: zh, en
    """
    # 构建摘要
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
    """
    生成 X/Twitter thread（3-5 条推文）。

    Returns: list of tweet strings
    """
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
    """
    Generate all insights: build directions, social post, and X thread.

    Returns: dict with keys: directions, social_post, x_thread
    """
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
