import json
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from openai import OpenAI

SCORE_PROMPT = """你是一个 AI 信息策展人。请分析以下文章，判断它是否值得推送给一个关注 AI 趋势和一人公司创业的读者。

文章标题：{title}
文章内容：{content}

请按以下 JSON 格式输出：
{{
  "topic": "主题分类（从以下选一个）：OPC/AI赚钱案例 | AI+电商 | AI工具实操/Agent工作流 | AI新技术/新模型 | AI投融资动态 | AI对行业的冲击 | 无关",
  "score": 评分(0-10，整数),
  "tags": ["标签1", "标签2"],
  "keep": true或false
}}

评分标准（信息密度 × 可操作性）：
有具体事实（数字/产品名/技术名）才有信息密度；读完之后能做某件事或做更好的判断，才有可操作性。
泛泛观点、营销软文、无数据的预测，直接 ≤4 分。

按主题的高分门槛：

▸ AI 新技术 / 新模型（得 8+ 分须满足）：
  - 有具体 benchmark 数据或与现有模型的对比
  - 有 API 可用性、定价或开源状态
  - 有实际能力演示或用户反馈
  缺以上任意两项 → 降 2 分

▸ OPC / AI 赚钱案例（得 8+ 分须满足）：
  - 有具体收入数字（月收入/年收入/ARR）
  - 有产品/服务形态描述
  - 有获客方式或冷启动路径
  缺收入数字 → 最高 6 分；缺其余任意一项 → 降 1 分

▸ AI 工具实操 / Agent 工作流（得 8+ 分须满足）：
  - 工具实操类：有可直接复用的 prompt 或操作步骤，有效果对比
  - Agent/工作流类：有具体工具组合或架构描述，有实际效果或成本数据
  - GitHub 开源项目：有明确功能描述和使用场景即可
  只有概念介绍、无落地内容 → 最高 5 分


▸ AI 对行业的冲击（得 8+ 分须满足）：
  - 有具体行业 + 具体影响数据（就业/效率/市场规模）
  - 有机会或风险的可操作结论
  纯观点预测无数据 → 最高 5 分

▸ AI + 电商（得 8+ 分须满足）：
  - 内容涵盖：AI 工具用于电商选品/广告/客服/独立站/内容生成/工作流/提示词等任意环节
  - 有具体工具名、操作步骤、效果数据或案例
  - 信息层面（行业动态）、实用技巧、新产品、工作流、提示词均视为高价值
  泛泛的"AI 将改变电商"无数据 → 最高 4 分

▸ AI 投融资动态（得 8+ 分须满足）：
  - 有融资金额 + 投资方 + 业务方向
  - 有估值或与上轮对比
  缺金额 → 最高 6 分

通用扣分项：
- 明显是 PR 稿 / 官方宣传：直接 ≤3 分
- 无原创内容，纯转载/聚合：-2 分
- 内容超过 14 天：-1 分
- 标题党，正文与标题严重不符：-3 分

keep 规则：score >= 5 且 topic != 无关 时为 true。
只输出 JSON，不要其他文字。"""

SUMMARY_PROMPT = """请为以下文章生成一段中文摘要，2-3 句话。

要求：
- 包含文章中最关键的具体事实（数字、产品名、技术名）
- 如果是 OPC/赚钱案例，必须包含：收入规模、实现方式、获客路径
- 如果是技术/模型，必须包含：核心能力提升、与现有方案的对比
- 如果是工具实操，必须包含：具体操作步骤或可复用的 prompt
- 不写"本文介绍了……"这类套话，直接陈述事实

文章标题：{title}
文章内容：{content}

只输出摘要文本，不要其他内容。"""

DEDUP_PROMPT = """以下是一批通过质量筛选的文章列表，格式为 [序号] 标题 (来源)。

请找出其中报道同一件事/同一产品/同一发布的文章组。
同一件事的判断标准：核心主题相同（如都在报道 Gemma 4 发布、都在报道某工具上线）。

对于每个重复组，只保留序号最小的那篇（通常是评分最高的，因为列表已按评分降序排列）。

{articles}

请按以下 JSON 格式输出需要删除的文章序号，如果没有重复则 to_remove 为空数组：
{{"to_remove": [2, 5, 8]}}
只输出 JSON，不要其他文字。"""

USAGE = {"input": 0, "output": 0}
_usage_lock = threading.Lock()


def _track(response) -> None:
    if getattr(response, "usage", None):
        with _usage_lock:
            USAGE["input"] += response.usage.prompt_tokens
            USAGE["output"] += response.usage.completion_tokens


def _reset_usage() -> None:
    with _usage_lock:
        USAGE["input"] = 0
        USAGE["output"] = 0


def _print_usage_summary(price_in: float, price_out: float) -> None:
    cost = USAGE["input"] / 1_000_000 * price_in + USAGE["output"] / 1_000_000 * price_out
    print(f"\n[USAGE] tokens in={USAGE['input']:,} out={USAGE['output']:,} | est. cost ${cost:.4f}")


def _call_with_retry(client: OpenAI, model: str, prompt: str, max_tokens: int,
                     json_mode: bool = False, attempts: int = 2):
    last_err: Exception | None = None
    for _ in range(attempts):
        kwargs = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        response = client.chat.completions.create(**kwargs)
        _track(response)
        raw = (response.choices[0].message.content or "").strip()
        if not raw:
            last_err = ValueError("empty response content")
            continue
        if json_mode:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                raw = match.group()
            try:
                return json.loads(raw)
            except json.JSONDecodeError as e:
                last_err = e
                continue
        return raw
    raise last_err  # type: ignore[misc]


def score_article(article: dict, client: OpenAI, model: str) -> dict:
    prompt = SCORE_PROMPT.format(
        title=article["title"],
        content=article["content"],
    )
    try:
        result = _call_with_retry(client, model, prompt, max_tokens=384, json_mode=True)
        topic = result.get("topic", "无关")
        score = int(result.get("score", 0))
        is_github_trending = article.get("source") == "GitHub Trending"
        threshold = 4 if is_github_trending else 5
        keep = score >= threshold and topic != "无关"
        article.update({
            "topic": topic,
            "score": score,
            "tags": result.get("tags", []),
            "keep": keep,
        })
    except Exception as e:
        print(f"  [WARN] Scoring failed for '{article['title']}': {e}")
        article.update({"topic": "无关", "score": 0, "tags": [], "keep": False})
    return article


def summarize_article(article: dict, client: OpenAI, model: str) -> str:
    prompt = SUMMARY_PROMPT.format(
        title=article["title"],
        content=article["content"],
    )
    try:
        return _call_with_retry(client, model, prompt, max_tokens=400, json_mode=False)
    except Exception as e:
        print(f"  [WARN] Summary failed for '{article['title']}': {e}")
        return ""


def _tokenize(text: str) -> set[str]:
    """Tokenize text for Jaccard comparison. Chinese: per-char; English: space-split."""
    tokens = set()
    for char in text:
        if "一" <= char <= "鿿":
            tokens.add(char)
    for word in text.split():
        if any("一" <= c <= "鿿" for c in word):
            continue
        tokens.add(word.lower())
    return tokens


def _jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    return len(a & b) / len(a | b)


def _find_suspect_groups(articles: list[dict], threshold: float = 0.4) -> list[list[int]]:
    """Group article indices whose titles are similar (Jaccard > threshold)."""
    n = len(articles)
    token_sets = [_tokenize(a["title"]) for a in articles]
    visited = set()
    groups = []
    for i in range(n):
        if i in visited:
            continue
        group = [i]
        for j in range(i + 1, n):
            if j in visited:
                continue
            if _jaccard(token_sets[i], token_sets[j]) > threshold:
                group.append(j)
                visited.add(j)
        if len(group) > 1:
            groups.append(group)
            visited.update(group)
    return groups


def dedup_articles(articles: list[dict], client: OpenAI, model: str) -> tuple[list[dict], list[dict]]:
    if len(articles) <= 1:
        return articles, []

    sorted_articles = sorted(articles, key=lambda x: x["score"], reverse=True)

    # Stage 1: Jaccard similarity to find suspect groups
    suspect_groups = _find_suspect_groups(sorted_articles)
    if not suspect_groups:
        print("  Dedup: no suspected duplicates found (Jaccard pre-filter)")
        return sorted_articles, []

    # Stage 2: Only send suspect groups to LLM for precise dedup
    suspect_indices = set()
    for group in suspect_groups:
        suspect_indices.update(group)

    lines = []
    index_map = {}  # local index -> original index
    for local_i, orig_i in enumerate(sorted(suspect_indices)):
        a = sorted_articles[orig_i]
        lines.append(f"[{local_i}] {a['title']} (来源: {a['source']}, 评分: {a['score']})")
        index_map[local_i] = orig_i

    prompt = DEDUP_PROMPT.format(articles="\n".join(lines))

    try:
        result = _call_with_retry(client, model, prompt, max_tokens=384, json_mode=True)
        to_remove_local = set(result.get("to_remove", []))
        to_remove = {index_map[i] for i in to_remove_local if i in index_map}
    except Exception as e:
        print(f"  [WARN] Dedup failed: {e}, skipping dedup")
        return sorted_articles, []

    deduped = [a for i, a in enumerate(sorted_articles) if i not in to_remove]
    dupes = [a for i, a in enumerate(sorted_articles) if i in to_remove]
    print(f"  Dedup: removed {len(dupes)} duplicate(s) (from {len(suspect_groups)} suspect group(s))")
    return deduped, dupes


def process_articles(articles: list[dict], api_key: str, cfg: dict) -> tuple[list[dict], list[dict]]:
    client = OpenAI(api_key=api_key, base_url=cfg["base_url"])
    _reset_usage()

    scoring_model = cfg["scoring_model"]
    summary_model = cfg["summary_model"]
    workers = cfg.get("score_workers", 4)

    print(f"\n[1/3] Scoring {len(articles)} articles...")
    scored = []
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(score_article, a, client, scoring_model): a
            for a in articles
        }
        for future in as_completed(futures):
            scored.append(future.result())

    kept = [a for a in scored if a["keep"]]
    rejected = [a for a in scored if not a["keep"]]
    print(f"  Kept {len(kept)} / {len(scored)} articles (score >= 5)")

    print(f"\n[2/3] Deduplicating {len(kept)} articles...")
    kept, dupes = dedup_articles(kept, client, scoring_model)
    rejected.extend(dupes)

    print(f"\n[3/3] Summarizing {len(kept)} articles...")
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(summarize_article, a, client, summary_model): a
            for a in kept
        }
        for future in as_completed(futures):
            article = futures[future]
            article["summary"] = future.result()

    _print_usage_summary(cfg["price_in_per_m"], cfg["price_out_per_m"])
    return kept, rejected
