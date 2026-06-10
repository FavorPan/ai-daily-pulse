# 需求文档：AI Daily Pulse「可做项目」功能重构

> 版本: v2.0  
> 日期: 2026-06-10  
> 状态: 待确认

---

## 1. 背景

当前「可做项目」功能（`src/insights.py` → `generate_build_directions`）的逻辑是：

1. 加载过去 7 天的 digest JSON
2. 分析跨天持续出现的标签（`_analyze_trends`）
3. 找出连续 7 天出现的主题
4. 让 LLM 基于这些「持续趋势」生成项目建议

**问题**：

- **滞后**：需要累积 7 天数据才有输出，新项目前几天跑不出结果
- **信号稀释**：7 天跨天标签粒度太粗，"AI agent" 这种标签连续出现不代表今天是好时机
- **无社区信号**：RSS 跨源检测只能衡量「几家媒体在报道」，无法反映「真人在社区里怎么讨论」

---

## 2. 目标

将「可做项目」从「7 天跨天趋势分析」改为「真实社区讨论热度 → 即时项目建议」。

核心思路：**用 last30days 一次全局搜索拿到社区真实讨论数据，反向匹配今日文章，挑出社区最关注的 2 篇，附上讨论度数据生成项目建议。**

---

## 3. 方案概述：全局搜索 + 交叉匹配

### 3.1 为什么是「一次全局搜索」

| 方案 | 搜索次数 | 耗时 | 问题 |
|------|---------|------|------|
| 每篇文章搜一次 | N 次 | N × 15s | 15 篇文章 = 3.75 分钟 |
| 全局搜一次 | 1 次 | ~15s | ✅ |

**不搜文章，搜话题。** 从当日所有入选文章中提取核心主题词，用一次 last30days 调用拿到整个 AI 领域今天的社区热度，再反向匹配到每篇文章。

### 3.2 数据流

```
┌──────────────────────────────────────────────────────────┐
│ 当日入选文章 (N 篇)                                        │
│                                                            │
│ 文章1: turbovec, tags=[向量量化, 开源工具], trend=开源工具   │
│ 文章2: HunterJobs, tags=[求职自动化, 一人公司]              │
│ 文章3: Luce Spark, tags=[MoE, 本地部署]                    │
│ ...                                                        │
│                                                            │
│ ▼ Step 1: 提取全局搜索词                                    │
│   聚合所有文章的 trend_topic + 高频 tag                      │
│   → "开源工具 一人公司 本地部署 AI Agent"                    │
│                                                            │
│ ▼ Step 2: 调 last30days 一次                               │
│   python3.12 last30days.py --quick --emit=json \           │
│     --search=reddit,hackernews \                           │
│     "开源工具 一人公司 本地部署 AI Agent"                    │
│   ~15 秒                                                   │
│                                                            │
│ ▼ Step 3: 交叉匹配                                          │
│   对每篇今日文章，计算与社区搜索结果的语义重叠度              │
│   → 挑出「和社区讨论最相关的 2 篇」                          │
│                                                            │
│ ▼ Step 4: 生成项目建议                                      │
│   附上该文章的真实社区讨论数据 → LLM → 2 个项目              │
└──────────────────────────────────────────────────────────┘
```

---

## 4. 详细设计

### 4.1 Step 1：提取全局搜索词

从当日所有入选文章中提取关键词，构造一个给 last30days 的搜索查询。

```python
def _build_search_query(articles: list[dict]) -> str:
    # 1. 收集所有 trend_topic（跨源热点词，优先级最高）
    trend_topics = [a["trend_topic"] for a in articles if a.get("trend_topic")]
    
    # 2. 收集所有 tags，按出现频次排序
    tag_freq = Counter()
    for a in articles:
        for t in a.get("tags", []):
            tag_freq[t.lower()] += 1
    
    # 3. 组合：trend_topics 优先 + top 3 高频 tag
    candidates = list(dict.fromkeys(trend_topics))  # 去重保序
    candidates += [t for t, _ in tag_freq.most_common(3) if t not in candidates]
    
    return " ".join(candidates[:5])
```

示例：
```
输入: trend_topics=["开源工具", "一人公司"], tags高频=["开源工具","本地部署","一人公司","AI Agent"]
输出: "开源工具 一人公司 本地部署 AI Agent"
```

### 4.2 Step 2：调用 last30days

```bash
python3.12 ~/.hermes/skills/last30days/scripts/last30days.py \
  --quick --emit=json \
  --search=reddit,hackernews \
  "开源工具 一人公司 本地部署 AI Agent"
```

耗时约 10-15 秒。返回 JSON 关键字段：

```json
{
  "items_by_source": {
    "reddit": [
      {
        "title": "turbovec crushes FAISS on ARM",
        "url": "https://reddit.com/r/LocalLLaMA/...",
        "engagement": {"num_comments": 47, "score": 289}
      }
    ],
    "hackernews": [
      {
        "title": "Turbovec: a new vector index",
        "url": "https://news.ycombinator.com/...",
        "engagement": {"comments": 85, "points": 312}
      }
    ]
  },
  "ranked_candidates": [
    {"candidate_id": "url1", "engagement": 95, "title": "..."},
    {"candidate_id": "url2", "engagement": 78, "title": "..."}
  ]
}
```

### 4.3 Step 3：交叉匹配

对每篇今日文章，计算它与社区搜索结果的关联度：

```python
def _match_social_pulse(article: dict, social_result: dict) -> dict:
    """
    计算一篇文章的社区讨论度。
    
    匹配策略：
    1. 提取文章的关键词（title 分词 + tags + trend_topic）
    2. 在社区结果中找标题包含相同关键词的条目
    3. 聚合这些条目的互动数据
    """
    article_keywords = set()
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
    sources_set = set()
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
```

按 `total_engagement` 降序排列所有文章，取 top 2。

### 4.4 Step 4：生成项目建议

把匹配到的社区数据附在 LLM prompt 里：

```
文章 1: turbovec
  RSS 入选评分: 9/10
  📡 社区讨论度:
    Reddit: 1 帖 · 289 赞 · 47 评论
    Hacker News: 1 篇 · 312 分 · 85 评论
    ⚡ 综合: 648 互动 · 跨 2 个平台

文章 2: HunterJobs
  RSS 入选评分: 8/10
  📡 社区讨论度:
    Reddit: 2 帖 · 712 赞 · 165 评论
    ⚡ 综合: 877 互动 · 跨 1 个平台
```

LLM 看到的不只是「这篇文章讲了什么」，还有「社区在怎么讨论它」。`why_now` 可以直接引用社区热议点。

### 4.5 输出格式

每个项目新增 `social_pulse` 字段：

```json
{
  "projects": [
    {
      "name": "ClipFlow",
      "description": "一键将长视频转为多平台短视频的 AI 工具",
      "target_user": "内容创作者、自媒体运营",
      "core_features": ["AI 自动识别高光片段", "多平台尺寸自适应", "一键添加字幕和 BGM"],
      "related_trends": ["AI视频剪辑", "短视频"],
      "why_now": "r/VideoEditing 上 560 upvotes 在讨论 Sora 2 API 降价，视频工具需求爆发",
      "monetization": "Freemium + 按处理时长付费",
      "difficulty": "medium",
      "estimated_mvp_days": 14,
      "source_article": "OpenAI Releases Sora 2 API with 80% Cost Reduction",
      "social_pulse": {
        "total_engagement": 648,
        "source_count": 2,
        "community_sources": ["hackernews", "reddit"],
        "matched_items": [
          {
            "source": "reddit",
            "title": "Sora 2 API is 80% cheaper — what are you building?",
            "url": "https://reddit.com/r/VideoEditing/...",
            "engagement": {"num_comments": 47, "score": 289}
          },
          {
            "source": "hackernews",
            "title": "OpenAI Sora 2: video generation at 1/5 the cost",
            "url": "https://news.ycombinator.com/...",
            "engagement": {"comments": 85, "points": 312}
          }
        ]
      }
    }
  ]
}
```

### 4.6 前端展示

在项目卡片中新增「📡 社区讨论度」区块：

```
┌──────────────────────────────────────────────────┐
│ 🎯 可做的项目                                      │
│ 基于真实社区讨论热度                                 │
│                                                   │
│ ┌──────────────────────────────────────────────┐ │
│ │ ClipFlow                         中等 · 14天  │ │
│ │ 一键将长视频转为多平台短视频的 AI 工具            │ │
│ │ 👤 内容创作者、自媒体运营                        │ │
│ │ ⏰ r/VideoEditing 上 560 upvotes 在讨论...     │ │
│ │ 💰 Freemium + 按处理时长付费                    │ │
│ │                                               │ │
│ │ 📡 社区讨论度                                  │ │
│ │ Reddit    1 帖 · 289 赞                       │ │
│ │ HN        1 篇 · 312 分 · 85 评论              │ │
│ │ ████████████████░░░░  综合热度 648             │ │
│ │ 跨 2 个平台热议                                 │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

热度条：`total_engagement` 映射为 0-100 的进度条，让用户直观感受讨论热度。

---

## 5. 改动范围

### 5.1 需修改的文件

| 文件 | 改动 |
|------|------|
| `src/insights.py` | 重写 `generate_build_directions` + `BUILD_DIRECTIONS_PROMPT`；新增 `_build_search_query`、`_fetch_social_pulse`、`_match_social_pulse`、`_pick_top_discussed`；删除 `_load_historical_digests` 和 `_analyze_trends` |
| `src/writer.py` | `build_digest_json` 透传 `social_pulse` 字段 |
| `web/lib/types.ts` | `BuildProject` 新增 `social_pulse` 和 `source_article` 字段 |
| `web/components/BuildDirections.tsx` | 渲染社区讨论度区块（进度条 + 分平台数据） |
| `config.toml` | 新增 `last30days` 配置节 |

### 5.2 不需修改的文件

| 文件 | 原因 |
|------|------|
| `main.py` | `generate_all_insights(kept, api_key, cfg)` 签名不变 |
| `src/scorer.py` | 不涉及 |
| `src/trends.py` | 趋势检测逻辑不变，insights 模块不再消费它来挑文章 |
| `tests/` | 无 insights 测试文件，不需要改 |

### 5.3 新增/删除的函数

| 函数 | 操作 | 说明 |
|------|------|------|
| `_load_historical_digests` | 删除 | 不再需要加载历史 digest |
| `_analyze_trends` | 删除 | 不再需要跨天趋势分析 |
| `_build_search_query` | 新增 | 从文章中提取全局搜索词 |
| `_fetch_social_pulse` | 新增 | 调用 last30days 子进程，返回 JSON |
| `_match_social_pulse` | 新增 | 计算文章与社区结果的关联度 |
| `_pick_top_discussed` | 新增 | 按社区讨论度排序取 top 2 |

### 5.4 配置新增

```toml
# config.toml 新增
[last30days]
enabled = false                    # 默认关闭，手动开启
engine_path = "~/.hermes/skills/last30days/scripts/last30days.py"
python_path = "python3.12"
timeout = 30                       # 子进程超时（秒）
search_sources = "reddit,hackernews"  # 搜索的平台
```

---

## 6. 边界情况与 Fallback

| 场景 | 处理 |
|------|------|
| `last30days.enabled = false` | 跳过社区搜索，fallback 到 RSS 信号（trend_source_count + score）挑文章 |
| last30days 子进程超时 | 记录 warning，fallback 到 RSS 信号 |
| last30days 返回空结果 | 记录 info，fallback 到 RSS 信号 |
| 所有文章匹配到的社区热度都为 0 | 正常生成项目，`social_pulse` 为空，前端不展示讨论度区块 |
| articles 为空 | 返回空列表 `[]`，不调 LLM |
| 只有 1 篇文章 | 只生成 1 个项目 |
| LLM 返回格式异常 | 返回空列表 `[]`，记录 warning 日志 |
| 纯中文话题（last30days 搜不到） | 社区热度为 0，项目照常生成但不展示讨论度 |

**Fallback 链**：
```
last30days 全局搜索
    │
    ├── 成功 → 按社区讨论度排序挑 top 2
    │
    └── 失败/超时/禁用 → 按 RSS trend_source_count 排序挑 top 2
                          → 不展示 social_pulse
```

---

## 7. 前端：Builder 独立页面

### 7.1 概述

将「可做的项目」从首页卡片中移出，升级为独立的 **Builder** 标签页。

**动机**：
- 当前 BuildDirections 嵌在首页，和文章列表混在一起，用户容易忽略
- 项目卡片信息有限（6 个字段），无法展示足够的决策信息
- Builder 独立页面可以承载更丰富的内容：实现路径、市场分析、社区热度等

### 7.2 导航变更

顶部导航栏新增「Builder」标签：

```
[今日] [全部文章] [Builder] [关于]
```

### 7.3 首页变更

首页 (`[locale]/page.tsx` 和 `[locale]/[date]/page.tsx`) 移除 `<BuildDirections>` 组件。改为在文章列表上方增加一条引导横幅：

```
┌──────────────────────────────────────────────────────┐
│ 🎯 今日有 2 个可做的项目                               │
│ 基于真实社区讨论热度，看看今天值得做什么 → 查看 Builder   │
└──────────────────────────────────────────────────────┘
```

点击跳转到 `/builder`。

### 7.4 Builder 页面结构

路由：`/[locale]/builder/`

```
┌──────────────────────────────────────────────────────┐
│ 🛠️ Builder                                           │
│ 基于真实社区讨论热度，从今日 AI 资讯中提炼的可做项目        │
│ 数据来源：last30days 社区讨论 + AI 日报 RSS 精选         │
│                                                       │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 📊 今日概览                                        │ │
│ │ 入选文章 15 篇 · 社区热议话题 3 个 · 可做项目 2 个    │ │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─────────── 项目 1 ───────────────────────────────┐ │
│ │                                                    │ │
│ │ 🏷️ 项目名称                   中等难度 · 14天 MVP   │ │
│ │ 一句话描述                                          │ │
│ │                                                    │ │
│ │ ┌─ 为什么是现在 ────────────────────────────────┐  │ │
│ │ │ 基于文章 + 社区讨论的具体时效性分析              │  │ │
│ │ └──────────────────────────────────────────────┘  │ │
│ │                                                    │ │
│ │ ┌─ 目标用户 ────────────────────────────────────┐  │ │
│ │ │ 用户画像 + 痛点描述                            │  │ │
│ │ └──────────────────────────────────────────────┘  │ │
│ │                                                    │ │
│ │ ┌─ 核心功能 ────────────────────────────────────┐  │ │
│ │ │ 1. 功能一                                       │  │ │
│ │ │ 2. 功能二                                       │  │ │
│ │ │ 3. 功能三                                       │  │ │
│ │ └──────────────────────────────────────────────┘  │ │
│ │                                                    │ │
│ │ ┌─ 变现模式 ────────────────────────────────────┐  │ │
│ │ │ Freemium + 按使用量付费                         │  │ │
│ │ └──────────────────────────────────────────────┘  │ │
│ │                                                    │ │
│ │ ┌─ 📡 社区讨论度 ───────────────────────────────┐  │ │
│ │ │ Reddit    3 帖 · 1,230 赞 · 89 评论             │  │ │
│ │ │ HN        2 篇 · 585 分 · 312 评论              │  │ │
│ │ │ ████████████████░░░░  综合热度 92/100            │  │ │
│ │ │ 跨 3 个平台热议                                   │  │ │
│ │ │                                                   │  │ │
│ │ │ 相关讨论:                                         │  │ │
│ │ │ · "Sora 2 API is 80% cheaper..." (r/VideoEditing)│  │ │
│ │ │ · "What are you building with Sora 2?" (HN)      │  │ │
│ │ └──────────────────────────────────────────────┘  │ │
│ │                                                    │ │
│ │ ┌─ 来源文章 ────────────────────────────────────┐  │ │
│ │ │ OpenAI Releases Sora 2 API (VentureBeat, 9/10)  │  │ │
│ │ │ → 阅读原文                                       │  │ │
│ │ └──────────────────────────────────────────────┘  │ │
│ │                                                    │ │
│ │ ┌─ 相关趋势标签 ────────────────────────────────┐  │ │
│ │ │ #AI视频 #API降价 #多模态                         │  │ │
│ │ └──────────────────────────────────────────────┘  │ │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─────────── 项目 2 ───────────────────────────────┐ │
│ │ ...（同上结构）                                     │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 7.5 与首页卡片的区别

| 维度 | 首页卡片（旧） | Builder 页面（新） |
|------|-------------|-----------------|
| 展示位置 | 嵌在文章列表上方 | 独立标签页 |
| 信息密度 | 6 个字段 | 完整展开，分区展示 |
| 社区讨论度 | 无 | 分平台数据 + 进度条 + 相关讨论链接 |
| 来源文章 | 无 | 显示来源文章标题/评分/链接 |
| 概览面板 | 无 | 今日数据总览 |
| 导航引导 | 无 | 首页横幅引导 |

### 7.6 数据加载

Builder 页面复用现有 `getDaily()` API，从 `digest-{date}.json` 的 `directions` 字段读取项目数据。

无需新增 API 端点。`directions` 数组已包含 `social_pulse` 和 `source_article` 字段（见 4.5 节）。

### 7.7 空状态

当今日没有生成项目时（`directions` 为空或不存在）：

```
┌──────────────────────────────────────────────────────┐
│ 🛠️ Builder                                           │
│                                                       │
│              今日暂无项目建议                            │
│    当 AI 日报检测到足够的热议话题时，会在这里生成可做项目    │
│                                                       │
│              ← 返回今日文章                             │
└──────────────────────────────────────────────────────┘
```

### 7.8 历史日期支持

Builder 页面支持日期参数：`/[locale]/builder/`（今天）和 `/[locale]/builder/[date]/`（历史日期）。

历史日期的 Builder 页面展示该日期的项目建议，与首页的日期切换逻辑一致。

---

## 8. 改动范围（更新）

### 8.1 需修改的文件

| 文件 | 改动 |
|------|------|
| `src/insights.py` | 重写 `generate_build_directions` + `BUILD_DIRECTIONS_PROMPT`；新增 `_build_search_query`、`_fetch_social_pulse`、`_match_social_pulse`、`_pick_top_discussed`；删除 `_load_historical_digests` 和 `_analyze_trends` |
| `src/writer.py` | `build_digest_json` 透传 `social_pulse` 字段 |
| `web/lib/types.ts` | `BuildProject` 新增 `social_pulse` 和 `source_article` 字段 |
| `web/components/HeaderNav.tsx` | 导航栏新增 Builder 链接 |
| `web/components/BuildDirections.tsx` | **删除**（功能迁移到 Builder 页面） |
| `web/app/[locale]/page.tsx` | 移除 BuildDirections，新增 Builder 引导横幅 |
| `web/app/[locale]/[date]/page.tsx` | 同上 |
| `web/app/[locale]/builder/page.tsx` | **新建** — Builder 主页 |
| `web/app/[locale]/builder/[date]/page.tsx` | **新建** — Builder 历史日期页 |
| `web/components/BuilderProjectCard.tsx` | **新建** — 项目详情卡片组件 |
| `web/components/BuilderOverview.tsx` | **新建** — 今日概览面板 |
| `web/messages/en.json` | 新增 builder 相关文案 |
| `web/messages/zh-CN.json` | 新增 builder 相关文案 |
| `web/messages/zh-TW.json` | 新增 builder 相关文案 |
| `config.toml` | 新增 `last30days` 配置节 |

### 8.2 不需修改的文件

| 文件 | 原因 |
|------|------|
| `main.py` | `generate_all_insights(kept, api_key, cfg)` 签名不变 |
| `src/scorer.py` | 不涉及 |
| `src/trends.py` | 趋势检测逻辑不变 |
| `tests/` | 无 insights 测试文件 |
| `web/lib/api.ts` | `getDaily()` 已返回 `directions`，无需改动 |
| `web/i18n/routing.ts` | 路由配置不变 |

### 8.3 新增/删除的函数

| 函数 | 操作 | 说明 |
|------|------|------|
| `_load_historical_digests` | 删除 | 不再需要加载历史 digest |
| `_analyze_trends` | 删除 | 不再需要跨天趋势分析 |
| `_build_search_query` | 新增 | 从文章中提取全局搜索词 |
| `_fetch_social_pulse` | 新增 | 调用 last30days 子进程，返回 JSON |
| `_match_social_pulse` | 新增 | 计算文章与社区结果的关联度 |
| `_pick_top_discussed` | 新增 | 按社区讨论度排序取 top 2 |

### 8.4 新增的组件

| 组件 | 说明 |
|------|------|
| `BuilderProjectCard` | 单个项目的完整详情卡片，分区展示：why_now、目标用户、核心功能、变现模式、社区讨论度、来源文章、标签 |
| `BuilderOverview` | 页面顶部概览面板：入选文章数、热议话题数、可做项目数 |

### 8.5 新增的路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/[locale]/builder/` | `builder/page.tsx` | Builder 主页（今天） |
| `/[locale]/builder/[date]/` | `builder/[date]/page.tsx` | Builder 历史日期页 |

### 8.6 新增的 i18n key

```json
{
  "nav": {
    "builder": "Builder"           // zh-CN: "可做项目"
  },
  "builder": {
    "title": "Builder",
    "subtitle": "基于真实社区讨论热度，从今日 AI 资讯中提炼的可做项目",
    "dataSource": "数据来源：last30days 社区讨论 + AI 日报 RSS 精选",
    "overview": "今日概览",
    "overviewArticles": "{count} 篇入选文章",
    "overviewTopics": "{count} 个热议话题",
    "overviewProjects": "{count} 个可做项目",
    "empty": "今日暂无项目建议",
    "emptyHint": "当 AI 日报检测到足够的热议话题时，会在这里生成可做项目",
    "backToToday": "← 返回今日文章",
    "whyNow": "为什么是现在",
    "targetUser": "目标用户",
    "coreFeatures": "核心功能",
    "monetization": "变现模式",
    "socialPulse": "社区讨论度",
    "socialPulseEmpty": "暂无社区讨论数据",
    "sourceArticle": "来源文章",
    "readOriginal": "阅读原文 ↗",
    "relatedTrends": "相关趋势",
    "difficulty": "难度",
    "mvpDays": "{days}天 MVP",
    "crossPlatform": "跨 {count} 个平台热议",
    "homeBanner": "今日有 {count} 个可做的项目",
    "homeBannerHint": "基于真实社区讨论热度，看看今天值得做什么",
    "homeBannerCta": "查看 Builder →"
  }
}
```

---

## 9. 验收标准

### 后端

- [ ] `last30days.enabled = false` 时，行为与当前版本兼容（RSS 信号 fallback）
- [ ] `last30days.enabled = true` 时，调用 last30days 全局搜索
- [ ] 社区讨论度数据正确匹配到对应文章
- [ ] 项目 JSON 包含 `social_pulse` 和 `source_article` 字段
- [ ] last30days 超时/失败时优雅降级，不阻塞 pipeline
- [ ] `generate_all_insights` 调用签名不变
- [ ] `pytest` 全部通过
- [ ] `main.py` 无需修改即可运行

### 前端

- [ ] 导航栏新增 Builder 标签，中英文正确显示
- [ ] 首页移除 BuildDirections 组件，改为 Builder 引导横幅
- [ ] 横幅在有项目时显示项目数量，无项目时不显示
- [ ] Builder 页面正确展示今日概览面板
- [ ] Builder 页面正确展示项目详情卡片（分区布局）
- [ ] 社区讨论度区块正确渲染（分平台数据 + 进度条 + 相关讨论链接）
- [ ] 无社区数据时显示「暂无社区讨论数据」
- [ ] 空状态页面正确展示（无项目时）
- [ ] 历史日期 Builder 页面正常工作
- [ ] 日期切换器在 Builder 页面正常工作
- [ ] `next build` 无报错（static export）
