<p align="center">
  <a href="README.md">English</a> · <a href="README-zh.md">中文</a>
</p>

<p align="center">
  <img src="web/public/logo.png" width="160" alt="AI Daily Pulse">
</p>

# AI Daily Pulse

> 🌐 **[ai-daily-pulse.top](https://ai-daily-pulse.top)** — 51 个信息源自动抓取 → AI 智能评分 → 语义去重 → 趋势检测 → 构建方向提炼 → 中英双语日报，每天早上打开就能看。

---

## 这是什么？

每天有大量 AI 资讯发布在各种平台上，手动刷太累、容易漏。

**AI Daily Pulse** 帮你自动完成：

1. 从 51 个 RSS 信息源抓取最新文章
2. **全文抽取**：RSS 内容过短（< 400 字符）时，用 trafilatura 抓取原文正文
3. **规则预筛选**：过滤低质量文章（节省 AI 调用成本）
4. AI 评分（0-10），只留高质量内容
5. **Jaccard 标题去重** + LLM 精确去重
6. **中英双语摘要**
7. **why_now 防幻觉**：轻量事实核查，不基于原文的评语会被清空（零额外 LLM 成本）
8. **趋势检测**：LLM 标签跨源聚类
9. **Digest 配额**：按主题和总量设上限，避免单一话题刷屏
10. **Insight 构建方向**：AI 生成可做项目建议，含难度、MVP 天数、变现模式，社区投票
11. **社媒文案**：自动生成 X/Twitter 发帖 + Thread

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

---

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
max_concurrency = 0                  # 0 = 不限；>0 限制 LLM 并发请求数（缓解 429）

[pipeline]
lookback_days = 1
dedup_window_days = 90
content_cap = 4000
fetch_workers = 8
score_workers = 4

[timeouts]                           # 统一超时配置（前缀映射）
fetch = 15                           # RSS 抓取
extract = 20                         # trafilatura 全文抽取
llm = 60                             # LLM API 调用

[digest]                             # 日报配额
max_per_topic = 8                    # 每个主题上限（按分数降序）
min_per_topic = 1                    # 不足时保底
max_total = 60                       # 全局上限，按分数降序截断

[insight]
sync_enabled = false                  # 部署 Worker 后设为 true
```

环境变量可覆盖 config.toml：`API_KEY`、`BASE_URL`、`SCORING_MODEL`、`SUMMARY_MODEL`、`LOOKBACK_DAYS`、`LLM_MAX_CONCURRENCY`、`TIMEOUTS_FETCH`、`TIMEOUTS_EXTRACT`、`TIMEOUTS_LLM`、`DIGEST_MAX_PER_TOPIC`、`DIGEST_MIN_PER_TOPIC`、`DIGEST_MAX_TOTAL`、`INSIGHT_API_URL`、`INSIGHT_SYNC_KEY`

---

## 成本

| 机制 | 说明 |
|------|------|
| 规则预筛选 | 过滤标题 < 5 字符、内容 < 100 字符且无关键词的文章 |
| 150+ 关键词 | AI 技术、商业模式、增长获客、电商、开源等 |
| 全文抽取 | 仅在 RSS 内容 < 400 字符时触发（避免不必要请求） |
| Jaccard 去重 | 标题相似度 > 0.4 才送 LLM |
| 90 天历史去重 | 已推送 URL 不再重复评分 |
| 内容截断 | 每篇最多 4000 字符 |
| why_now 事实核查 | 基于正则的接地检查，无额外 LLM 调用 |
| LLM 并发上限 | 可选信号量（默认关闭），主动减少 429 风暴 |

单次运行成本约 **$0.01-0.02**（DeepSeek V4 Flash）。

---

## 可靠性

- **tenacity 重试**：429/5xx/超时指数退避重试（401 立即失败）；429 会被重试，可选并发信号量主动降低其发生频率
- **Provider fallback**：可配置主 → 备模型/base_url，单个 provider 故障不会拖垮整次运行
- **原子写入**：所有输出文件经临时文件 + 原子重命名写入，崩溃不会留下半写文件
- **Pydantic 评分校验**：LLM 评分响应先过 schema 校验，拒绝畸形 JSON
- **Feed 健康监控**：追踪每个源的成功/失败，连续失败 ≥ 3 次告警
- **空运行保护**：0 篇通过质量筛选 → 退出且不覆盖 `latest.json`
- **当日 URL 去重**：单次运行内同 URL 保留分数最高的一篇

---

## 项目结构

```
ai-daily-pulse/
├── main.py                      # 入口：抓取 → 去重 → 评分 → 趋势 → 洞察 → 写出
├── config.toml                  # AI 模型与管线配置
├── feeds.toml                   # RSS 信息源列表（51 个）
├── requirements.txt             # Python 依赖
│
├── src/                         # Python 管线
│   ├── config.py                # 配置加载（env 覆盖、section 前缀）
│   ├── models.py                # Pydantic ContentItem + ScoreResult 模型
│   ├── llm.py                   # LLMClient：重试、provider fallback、并发信号量
│   ├── scrapers/                # Scraper 抽象
│   │   ├── base.py              # BaseScraper 接口
│   │   └── rss.py               # RSS 抓取 + trafilatura 全文兜底
│   ├── feeds.py                 # Feed 加载 + 并发抓取编排
│   ├── feed_health.py           # Feed 健康监控
│   ├── history.py               # URL 历史去重（90 天窗口）
│   ├── dedup.py                 # Jaccard + LLM 精确去重
│   ├── scorer.py                # AI 评分、中英摘要、why_now + 事实核查
│   ├── trends.py                # 趋势检测：LLM 标签跨源聚类
│   ├── insights.py              # 构建方向提炼 + 社媒文案生成（双语）
│   ├── file_utils.py            # 原子写入工具
│   ├── sync_insights.py         # 同步构建方向到 Worker API
│   └── writer.py                # Digest JSON 输出 + 配额执行
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
fetch (并发8) → fulltext extract (内容不足时) → prefilter (规则) → history dedup (URL) → score (并发4) → dedup (Jaccard+LLM) → summarize_zh (并发4) → summarize_en (并发4) → why_now (score≥7, 事实核查) → trend_detect (tags) → insights (build directions + social posts) → write (JSON, 配额执行) → sync to Worker API
```

---

## 技术栈

**管线**：Python 3.11+ · feedparser · OpenAI SDK · GitHub Actions

**前端**：Next.js 16 · React 19 · TypeScript · Tailwind CSS · next-intl

**后端 API**：Cloudflare Workers · Hono · D1 (SQLite) · JWT (jose) · Resend (邮件)

---

## License

MIT
