# AI Daily Pulse

[🇨🇳 中文版](#中文版) | [🇬🇧 English](#ai-daily-pulse)

> 🌐 **[ai-daily-pulse.top](https://ai-daily-pulse.top)** — 47 RSS feeds → AI scoring → semantic dedup → trend detection → build directions → bilingual daily digest. Open once a day, read only what matters.

---

## What is this?

Every day, massive amounts of AI news are published across platforms. Manually keeping up is exhausting and you'll miss things.

**AI Daily Pulse** automates this:

1. Fetches from 47 RSS sources (English + Chinese)
2. **Rule-based prefiltering**: drops low-quality articles (saves AI costs)
3. AI scores each article (0-10), keeps only high-quality content
4. **Jaccard title dedup**: coarse similarity check before LLM precise dedup
5. **Bilingual summaries**: Chinese + English summaries for every article
6. **Trend detection**: cross-source clustering based on LLM tags
7. **Build directions (Insight)**: AI-generated project ideas with difficulty, MVP days, monetization — community-voted
8. **Social media copy**: auto-generated X/Twitter posts + Threads

Fully automated. You just **open it once a day**.

### Focus Areas

- OPC / solopreneur / AI monetization cases
- AI + ecommerce
- AI tools & Agent workflows
- AI new tech / new models
- Funding & investment news

---

## Web Frontend

Online at [**ai-daily-pulse.top**](https://ai-daily-pulse.top)

| Page | Description |
|------|-------------|
| **Home** | Today's pulse + featured articles |
| **Explore** | Topic filtering, keyword search, date range picker, 15 per page |
| **Insight** | All-time build directions with community voting (👍 Good / 🤔 Maybe / 👎 Don't), 30 per page |
| **Detail** | Full article summary, AI commentary, tags, source link |
| **About** | Project background & author info |

### Features

- **Insight Voting**: Sign in with GitHub / Google / Email to vote on project ideas. One vote per idea per user.
- **Date Range Picker**: Filter articles and ideas by date range (replaces old date dropdown)
- **i18n**: zh-CN / zh-TW / English (default: English)
- **Dark mode**: auto-follows system or manual toggle
- **Pagination**: Explore 15/page, Insight 30/page
- **Responsive**: two-column card layout on desktop

Deployed on Cloudflare Pages + Cloudflare Workers (API backend with D1 database).

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│              Cloudflare Pages                      │
│  Next.js 16 static export (ai-daily-pulse.top)     │
│  Reads output/digest-*.json                        │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│        Cloudflare Worker (api.ai-daily-pulse.top)  │
│        Hono + D1 (SQLite)                          │
│        Auth (GitHub/Google/Email) + Voting API      │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│              GitHub Actions (daily at 09:00 CST)   │
│  Python pipeline → output/digest-*.json            │
│  Syncs build directions to Worker API              │
└──────────────────────────────────────────────────┘
```

---

## Quick Start (5 min)

### 1. Fork this repo

Click **Fork** in the top-right corner.

### 2. Get an API Key

Works with any OpenAI-compatible API (DeepSeek, OpenAI, OpenRouter, Ollama, etc.).

> Recommended: [DeepSeek](https://platform.deepseek.com) — cheap, reliable, free credits on signup.

### 3. Add API Key to GitHub

Go to your fork → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name | Value |
|------|-------|
| `API_KEY` | Your API key |

### 4. Enable GitHub Actions

Go to the **Actions** tab, click **"I understand my workflows, go ahead and enable them"**.

**Done.** Runs daily at 09:00 Beijing time. Results are committed to `output/`.

---

## Local Development

### Python Pipeline

```bash
git clone https://github.com/YOUR_USERNAME/ai-daily-pulse.git
cd ai-daily-pulse

pip install -r requirements.txt
export API_KEY=sk-...
python main.py

# Fetch multiple days
LOOKBACK_DAYS=3 python main.py
```

Output:
- `output/digest-YYYY-MM-DD.json` — structured data for web frontend
- `output/latest.json` — latest digest copy

### Web Frontend

```bash
cd web
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### Worker API (Insight backend)

```bash
cd worker
npm install
npx wrangler dev --local --port 8787
```

Then start web with: `NEXT_PUBLIC_API_URL=http://localhost:8787 npm run dev`

---

## Configuration

All settings in [config.toml](config.toml):

```toml
[api]
api_key = ""                          # or use API_KEY env var
base_url = "https://api.deepseek.com"
scoring_model = "deepseek-v4-flash"
summary_model = "deepseek-v4-flash"
price_in_per_m = 0.14
price_out_per_m = 0.28

[pipeline]
lookback_days = 1
dedup_window_days = 90
content_cap = 4000
output_dir = "output"
fetch_timeout = 15
fetch_workers = 8
score_workers = 4

[insight]
sync_enabled = false                  # set to true after deploying Worker
```

Environment variables override config.toml:

| Variable | Purpose |
|----------|---------|
| `API_KEY` | API key |
| `BASE_URL` | API endpoint |
| `SCORING_MODEL` | Scoring model |
| `SUMMARY_MODEL` | Summary model |
| `LOOKBACK_DAYS` | Lookback days |
| `INSIGHT_API_URL` | Worker API URL for sync |
| `INSIGHT_SYNC_KEY` | Worker API sync key |

---

## Scoring System

Each article is scored 0-10 by AI. Core criteria: **information density × actionability**.

- Specific numbers, product names, technical details → high information density
- Enables action or better decisions → high actionability
- Vague opinions, marketing fluff, unsupported predictions → ≤ 4

**Keep threshold**: ≥ 5 (≥ 4 for GitHub Trending) AND topic is relevant.

Same event covered by multiple sources → only the highest-scored article is kept (Jaccard title similarity pre-filter + LLM precise dedup).

---

## Cost

Built-in cost controls:

| Mechanism | Description |
|-----------|-------------|
| Rule prefilter | Drop titles < 5 chars, content < 100 chars without AI keywords |
| 150+ keywords | AI tech, business models, growth, ecommerce, open source |
| Jaccard dedup | Title similarity > 0.4 before LLM check |
| 90-day history dedup | Already-pushed URLs are skipped |
| Content cap | 4000 chars max per article |

Typical cost per run: **~$0.01-0.02** (DeepSeek V4 Flash).

---

## Reliability

- **Auto retry**: 3 attempts with exponential backoff (2s, 4s) for 429/5xx/timeout
- **Feed health monitoring**: tracks per-feed success/failure, warns at ≥ 3 consecutive failures
- **Empty run protection**: 0 articles passing quality filter → exits without overwriting `latest.json`

---

## Project Structure

```
ai-daily-pulse/
├── main.py                      # Entry: fetch → dedup → score → trends → insights → write
├── config.toml                  # AI model & pipeline config
├── feeds.toml                   # RSS feed list (47 sources)
├── requirements.txt             # Python dependencies
│
├── src/                         # Python pipeline
│   ├── config.py                # Config loader (env overrides)
│   ├── feeds.py                 # RSS fetch, content cleanup, rule prefilter
│   ├── feed_health.py           # Feed health monitoring
│   ├── history.py               # URL history dedup (90-day window)
│   ├── scorer.py                # AI scoring, Jaccard dedup, bilingual summaries, why_now
│   ├── trends.py                # Trend detection: LLM tag cross-source clustering
│   ├── insights.py              # Build directions + social media copy (bilingual)
│   ├── sync_insights.py         # Sync directions to Worker API
│   └── writer.py                # Digest JSON output
│
├── web/                         # Next.js 16 frontend
│   ├── app/[locale]/
│   │   ├── page.tsx             # Home: today's pulse + featured
│   │   ├── explore/             # Explore: topic filter + search + date range
│   │   ├── insight/             # Insight: all-time build directions + voting
│   │   ├── item/[date]/[id]/    # Article detail
│   │   └── about/               # About page
│   ├── components/              # InsightCard, VoteBar, AuthModal, ExploreClient, etc.
│   ├── lib/                     # api.ts, api-client.ts, auth.tsx, types.ts
│   └── messages/                # i18n (zh-CN, zh-TW, en)
│
├── worker/                      # Cloudflare Worker (Hono + D1)
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── auth.ts              # GitHub/Google/Email OAuth
│   │   ├── ideas.ts             # Ideas CRUD + sync
│   │   ├── vote.ts              # Voting endpoints
│   │   ├── middleware.ts        # JWT auth middleware
│   │   └── db.ts                # D1 helpers + schema init
│   ├── schema.sql               # D1 table definitions
│   └── wrangler.toml            # Worker config
│
├── output/                      # Pipeline output (CI commits daily)
│   ├── digest-YYYY-MM-DD.json   # Structured data for web
│   └── latest.json              # Latest digest copy
│
├── data/
│   ├── pushed.json              # Pushed URL history
│   └── feed_health.json         # Feed health status
│
├── tests/                       # pytest tests
└── .github/workflows/
    ├── daily.yml                # Daily pipeline (09:00 CST)
    └── deploy-worker.yml        # Worker deploy on push
```

---

## Pipeline Flow

```
fetch (8 concurrent) → prefilter (rules) → history dedup (URL) → score (4 concurrent) → dedup (Jaccard+LLM) → summarize_zh (4 concurrent) → summarize_en (4 concurrent) → why_now (score≥7) → trend_detect (tags) → insights (build directions + social posts) → write (JSON) → sync to Worker API
```

---

## Tech Stack

**Pipeline**: Python 3.11+ · feedparser · OpenAI SDK · GitHub Actions

**Frontend**: Next.js 16 · React 19 · TypeScript · Tailwind CSS · next-intl

**Backend API**: Cloudflare Workers · Hono · D1 (SQLite) · JWT (jose) · Resend (email)

**Hosting**: Cloudflare Pages + Cloudflare Workers

---

## License

MIT

---

## 中文版

# AI Daily Pulse

[🇬🇧 English](#ai-daily-pulse) | [🇨🇳 中文版](#中文版)

> 🌐 **[ai-daily-pulse.top](https://ai-daily-pulse.top)** — 47 个信息源自动抓取 → AI 智能评分 → 语义去重 → 趋势检测 → 构建方向提炼 → 中英双语日报，每天早上打开就能看。

---

## 这是什么？

每天有大量 AI 资讯发布在各种平台上，手动刷太累、容易漏。

**AI Daily Pulse** 帮你自动完成：

1. 从 47 个 RSS 信息源抓取最新文章
2. **规则预筛选**：过滤低质量文章（节省 AI 调用成本）
3. AI 评分（0-10），只留高质量内容
4. **Jaccard 标题去重** + LLM 精确去重
5. **中英双语摘要**
6. **趋势检测**：LLM 标签跨源聚类
7. **Insight 构建方向**：AI 生成可做项目建议，含难度、MVP 天数、变现模式，社区投票
8. **社媒文案**：自动生成 X/Twitter 发帖 + Thread

全自动，每天**打开看一眼**就行。

### 关注方向

- OPC / 一人公司 / AI 赚钱案例
- AI + 电商
- AI 工具实操 / Agent 工作流
- AI 新技术 / 新模型
- 投融资动态

---

## Web 前端

在线访问：[**ai-daily-pulse.top**](https://ai-daily-pulse.top)

| 页面 | 说明 |
|------|------|
| **首页** | 今日脉搏 + 精选文章 |
| **Explore 全部文章** | 主题筛选、关键词搜索、日期区间选择器，每页 15 条 |
| **Insight 项目灵感** | 全部历史构建方向 + 社区投票（👍 看好 / 🤔 观望 / 👎 不看好），每页 30 条 |
| **详情** | 完整摘要、AI 评语、标签、原文链接 |
| **关于** | 项目背景与作者信息 |

### 功能亮点

- **Insight 投票**：GitHub / Google / 邮箱登录后投票，每人每个 idea 限投一票
- **日期区间选择器**：替代旧的日期下拉框，支持按日期范围筛选
- **多语言**：zh-CN / zh-TW / English（默认英文）
- **暗色模式**：跟随系统或手动切换
- **分页**：Explore 15 条/页，Insight 30 条/页
- **响应式**：桌面端两列卡片布局

部署在 Cloudflare Pages + Cloudflare Workers（API 后端 + D1 数据库）。

---

## 架构

```
┌──────────────────────────────────────────────────┐
│              Cloudflare Pages                      │
│  Next.js 16 静态导出 (ai-daily-pulse.top)          │
│  读取 output/digest-*.json                         │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│        Cloudflare Worker (api.ai-daily-pulse.top)  │
│        Hono + D1 (SQLite)                          │
│        登录 (GitHub/Google/邮箱) + 投票 API         │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│              GitHub Actions (每天 09:00 运行)       │
│  Python 管线 → output/digest-*.json                │
│  同步构建方向到 Worker API                          │
└──────────────────────────────────────────────────┘
```

---

## 快速开始（5 分钟）

### 1. Fork 仓库

点右上角 **Fork**。

### 2. 获取 API Key

支持任何 OpenAI 兼容 API（DeepSeek、OpenAI、OpenRouter、Ollama 等）。

> 推荐 [DeepSeek](https://platform.deepseek.com) — 便宜好用，注册送额度。

### 3. 添加 API Key 到 GitHub

仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name | Value |
|------|-------|
| `API_KEY` | 你的 API Key |

### 4. 启用 GitHub Actions

点 **Actions** 标签页，点 **"I understand my workflows, go ahead and enable them"**。

**搞定。** 每天北京时间 09:00 自动运行，结果提交到 `output/`。

---

## 本地运行

### Python 管线

```bash
git clone https://github.com/你的用户名/ai-daily-pulse.git
cd ai-daily-pulse

pip install -r requirements.txt
export API_KEY=sk-...
python main.py

# 多抓几天
LOOKBACK_DAYS=3 python main.py
```

输出：
- `output/digest-YYYY-MM-DD.json` — Web 前端数据
- `output/latest.json` — 最新 digest 副本

### Web 前端

```bash
cd web
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

### Worker API（Insight 后端）

```bash
cd worker
npm install
npx wrangler dev --local --port 8787
```

然后启动前端：`NEXT_PUBLIC_API_URL=http://localhost:8787 npm run dev`

---

## 配置

所有配置在 [config.toml](config.toml)：

```toml
[api]
api_key = ""                          # 或用环境变量 API_KEY
base_url = "https://api.deepseek.com"
scoring_model = "deepseek-v4-flash"
summary_model = "deepseek-v4-flash"

[pipeline]
lookback_days = 1
dedup_window_days = 90
content_cap = 4000
fetch_workers = 8
score_workers = 4

[insight]
sync_enabled = false                  # 部署 Worker 后设为 true
```

环境变量可覆盖 config.toml：`API_KEY`、`BASE_URL`、`SCORING_MODEL`、`LOOKBACK_DAYS`、`INSIGHT_API_URL`、`INSIGHT_SYNC_KEY`

---

## 成本

| 机制 | 说明 |
|------|------|
| 规则预筛选 | 过滤标题 < 5 字符、内容 < 100 字符且无关键词的文章 |
| 150+ 关键词 | AI 技术、商业模式、增长获客、电商、开源等 |
| Jaccard 去重 | 标题相似度 > 0.4 才送 LLM |
| 90 天历史去重 | 已推送 URL 不再重复评分 |
| 内容截断 | 每篇最多 4000 字符 |

单次运行成本约 **$0.01-0.02**（DeepSeek V4 Flash）。

---

## 技术栈

**管线**：Python 3.11+ · feedparser · OpenAI SDK · GitHub Actions

**前端**：Next.js 16 · React 19 · TypeScript · Tailwind CSS · next-intl

**后端 API**：Cloudflare Workers · Hono · D1 (SQLite) · JWT (jose) · Resend (邮件)

**托管**：Cloudflare Pages + Cloudflare Workers

---

## License

MIT
