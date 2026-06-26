<p align="center">
  <a href="README.md">English</a> · <a href="README-zh.md">中文</a>
</p>

# AI Daily Pulse

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
| **Insight 项目灵感** | 全部历史构建方向 + 社区投票（看好 / 观望 / 不看好），每页 30 条 |
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

## 项目结构

```
ai-daily-pulse/
├── main.py                      # 入口：抓取 → 去重 → 评分 → 趋势 → 洞察 → 写出
├── config.toml                  # AI 模型与管线配置
├── feeds.toml                   # RSS 信息源列表（47 个）
├── requirements.txt             # Python 依赖
│
├── src/                         # Python 管线
│   ├── config.py                # 配置加载（env 可覆盖）
│   ├── feeds.py                 # RSS 抓取、内容清理、规则预筛选
│   ├── feed_health.py           # Feed 健康监控
│   ├── history.py               # URL 历史去重（90 天窗口）
│   ├── scorer.py                # AI 评分、Jaccard 去重、中英摘要、why_now
│   ├── trends.py                # 趋势检测：LLM 标签跨源聚类
│   ├── insights.py              # 构建方向提炼 + 社媒文案生成（双语）
│   ├── sync_insights.py         # 同步构建方向到 Worker API
│   └── writer.py                # Digest JSON 输出
│
├── web/                         # Next.js 16 前端
│   ├── app/[locale]/
│   │   ├── page.tsx             # 首页：今日脉搏 + 精选
│   │   ├── explore/             # Explore：主题筛选 + 搜索 + 日期区间
│   │   ├── insight/             # Insight：全部历史构建方向 + 投票
│   │   ├── item/[date]/[id]/    # 文章详情
│   │   └── about/               # 关于页面
│   ├── components/              # InsightCard, VoteBar, AuthModal 等
│   ├── lib/                     # api.ts, api-client.ts, auth.tsx, types.ts
│   └── messages/                # i18n (zh-CN, zh-TW, en)
│
├── worker/                      # Cloudflare Worker (Hono + D1)
│   ├── src/
│   │   ├── index.ts             # 入口
│   │   ├── auth.ts              # GitHub/Google/邮箱 OAuth
│   │   ├── ideas.ts             # Ideas CRUD + 同步
│   │   ├── vote.ts              # 投票接口
│   │   ├── middleware.ts        # JWT 认证中间件
│   │   └── db.ts                # D1 工具函数 + 建表
│   ├── schema.sql               # D1 表定义
│   └── wrangler.toml            # Worker 配置
│
├── output/                      # 管线产出（CI 每日提交）
│   ├── digest-YYYY-MM-DD.json   # Web 用结构化数据
│   └── latest.json              # 最新 digest 副本
│
├── data/
│   ├── pushed.json              # 已推送 URL 记录
│   └── feed_health.json         # Feed 健康状态
│
├── tests/                       # pytest 测试
└── .github/workflows/
    ├── daily.yml                # 每日管线 (09:00 CST)
    └── deploy-worker.yml        # Worker 部署
```

---

## 管线流程

```
fetch (并发8) → prefilter (规则) → history dedup (URL) → score (并发4) → dedup (Jaccard+LLM) → summarize_zh (并发4) → summarize_en (并发4) → why_now (score≥7) → trend_detect (tags) → insights (build directions + social posts) → write (JSON) → sync to Worker API
```

---

## 技术栈

**管线**：Python 3.11+ · feedparser · OpenAI SDK · GitHub Actions

**前端**：Next.js 16 · React 19 · TypeScript · Tailwind CSS · next-intl

**后端 API**：Cloudflare Workers · Hono · D1 (SQLite) · JWT (jose) · Resend (邮件)

**托管**：Cloudflare Pages + Cloudflare Workers

---

## License

MIT
