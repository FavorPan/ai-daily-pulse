# AI Daily Pulse

[📖 Read this in English](README-en.md)

> 🌐 **[ai-daily-pulse.top](https://ai-daily-pulse.top)** — 47 个信息源自动抓取 → 规则预筛选 → AI 智能评分 → 语义去重 → 趋势检测 → last30days 构建方向提炼 → 中英双语日报，每天早上打开就能看。

---

## 这是什么？

每天有大量 AI 资讯发布在各种平台上，手动刷太累、容易漏。

**AI Daily Pulse** 帮你自动完成这件事：

1. 从 47 个 RSS 信息源（英文 + 中文）抓取最新文章
2. **规则预筛选**：过滤标题过短、内容过少的低质量文章（节省 AI 调用成本）
3. 用 AI 给每篇文章打分（0-10），只留高质量内容
4. **Jaccard 标题去重**：先用词级相似度粗筛，疑似重复才送 AI 精确判断
5. **中英双语摘要**：每篇入选文章自动生成中文 + 英文摘要
6. **趋势检测**：基于 LLM 标签的跨源聚类，识别持续出现的主题
7. **构建方向提炼**：基于 last30days 社区讨论热度，自动生成可做的 AI 项目建议（含难度、MVP 天数、变现模式）
8. **社媒文案生成**：自动生成 X/Twitter 发帖文案 + Thread

整个过程全自动，你只需要**每天打开看一眼**。

### 关注方向

- OPC / 一人公司 / AI 赚钱案例（含收入数字、获客路径、冷启动方法）
- AI + 电商（选品、广告、独立站、工作流）
- AI 工具实操 / Agent 工作流（可复用的 prompt、操作步骤、开源项目）
- AI 新技术 / 新模型（benchmark 数据、API 定价、开源状态）
- 投融资动态（融资金额、估值、投资方）

---

## 效果长什么样？

每天生成一份 `output/AI Daily - YYYY-MM-DD.md`，打开后是这样的：

```markdown
## OPC/AI赚钱案例

### [40 installs per day to 130. 34 USD per day to 130.](https://reddit.com/...)
- **来源**：Reddit r/SideProject
- **评分**：8/10
- **标签**：`#ASO实战` `#一人公司` `#增长黑客`
- **AI 评语**：💡 ASO 优化是当前移动端增长最被低估的杠杆，本周多个独立开发者分享类似经验
- **摘要**：开发者通过5个ASO优化调整，将应用从每天40次自然安装、34美元收入提升至
  130次安装、130美元收入。核心改动包括：在标题中加入主关键词、副标题改为结果导向
  表述、首屏截图展示使用后效果（转化率提升18%）...

## AI新技术/新模型

### [Gemma 4: 全面超越 Gemma 3 的最佳小型多模态开源模型](https://latent.space/...)
- **来源**：Latent Space
- **评分**：8/10
- **标签**：`#开源模型` `#多模态`
- **摘要**：...
```

按主题分组，按评分排序，高分内容排在前面。

运行结束时会打印摘要：

```
=== 运行摘要 ===
抓取：148 篇 → 预筛选：69 篇 → 去重后：8 篇 → 入选：8 篇
按主题分布：
  OPC/AI赚钱案例: 2 篇
  AI工具实操/Agent工作流: 2 篇
  AI新技术/新模型: 2 篇
  AI投融资动态: 2 篇
趋势信号：3 篇文章命中跨源主题
Token: 76K in / 4.2K out | 成本: $0.012
耗时: 总计 66s（抓取 6s + 评分 55s + 去重 0s + 摘要 5s）
```

---

## Web 前端

在线浏览日报：[**ai-daily-pulse.top**](https://ai-daily-pulse.top)

- **首页**：今日脉搏 + 精选文章
- **Builder（可做项目）**：基于过去 30 天社区真实讨论热度提炼的 AI 产品建议，含难度评级、MVP 天数、变现模式、社区热度。卡片默认折叠只展示关键信息，点击展开查看详情
- **探索**：按主题筛选、关键词搜索
- **详情**：查看单篇完整摘要、AI 评语、标签、原文链接
- **日期切换**：顶栏下拉可浏览历史日报
- **多语言**：zh-CN / zh-TW / English 三语切换
- **暗色模式**：自动跟随系统或手动切换
- **根路径**：访问 `/` 自动跳转 `/zh-CN/`

部署在 Cloudflare Pages，每次 GitHub Actions 跑完自动更新。

---

## 5 分钟部署指南

### 第 1 步：Fork 这个仓库

点右上角 **Fork**，把仓库复制到你的 GitHub 账户下。

### 第 2 步：获取 API Key

本项目支持任何兼容 OpenAI 格式的 API（DeepSeek、OpenAI、OpenRouter、Ollama 等）。选一个你已有的或去注册一个，拿到 API Key。

> 推荐 [DeepSeek](https://platform.deepseek.com) — 便宜、好用，注册即送额度。

### 第 3 步：把 API Key 存到 GitHub

进入你 fork 的仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name | Value |
|------|-------|
| `API_KEY` | 你的 API Key |

### 第 4 步：启用 GitHub Actions

点仓库顶部的 **Actions** 标签页，点 **"I understand my workflows, go ahead and enable them"**。

**搞定。** 每天北京时间 09:00 自动运行，结果会提交到 `output/` 目录。

---

## 本地运行（可选）

如果你想在自己电脑上跑：

```bash
# 克隆仓库
git clone https://github.com/你的用户名/ai-daily-pulse.git
cd ai-daily-pulse

# 安装依赖
pip install -r requirements.txt

# 设置 API Key（二选一）
export API_KEY=sk-...                # 方式一：环境变量
# 或者编辑 config.toml 里的 api.api_key  # 方式二：配置文件

# 运行
python main.py

# 如果想多抓几天的内容（默认只抓最近 1 天）
LOOKBACK_DAYS=3 python main.py
```

运行后在 `output/` 目录下会生成：

- `output/AI Daily - YYYY-MM-DD.md` — Obsidian 日报
- `output/digest-YYYY-MM-DD.json` — Web 前端数据（含趋势、构建方向、社媒文案）
- `output/latest.json` — 指向最近一日的 digest

---

## Web UI 本地开发

```bash
# 确保已有 digest JSON（运行过 python main.py，或仓库已含 output/latest.json）
cd web
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

### 部署到 Cloudflare Pages

项目已部署到 Cloudflare Pages（`ai-daily-pulse.top`）。配置要点：

- 项目类型：**Pages**（不是 Workers）
- 根目录：`/`
- 构建命令：`cd web && npm install && npm run build`
- 构建输出目录：`web/out`
- 环境变量：`NODE_VERSION=20`、`SKIP_DEPENDENCY_INSTALL=true`

也可以部署到 Vercel：

1. 导入本 GitHub 仓库
2. **Root Directory** 设为 `web`
3. Framework Preset：Next.js（默认即可）
4. 确保 CI 每日提交的 `output/latest.json` 在仓库中（与 Markdown 一同由 Actions 推送）

---

## 同步到 Obsidian（可选）

如果你用 Obsidian 做知识管理，可以用 [Obsidian Git](https://github.com/denolehov/obsidian-git) 插件自动同步：

```bash
# 在你的 Obsidian vault 目录下克隆仓库
cd /path/to/your/vault
git clone https://github.com/你的用户名/ai-daily-pulse.git "AI Daily"
```

然后安装 Obsidian Git 插件（社区插件市场搜 "Git"），设置：
- **Custom base path**：`AI Daily`
- **Pull on startup**：开启
- **Auto pull interval**：`60`（分钟）

之后每次打开 Obsidian 都会自动拉取最新日报。

---

## 怎么定制？

### 添加或删除信息源

编辑 [feeds.toml](feeds.toml)，每个信息源的格式：

```toml
[[feeds]]
name = "信息源名称"
url  = "https://example.com/feed.xml"
lang = "zh"  # 中文用 "zh"，英文用 "en"
```

当前覆盖 47 个来源，按方向分类：

| 方向 | 来源举例 |
|------|----------|
| OPC/创业案例 | Indie Hackers · Reddit r/SideProject · Reddit r/Entrepreneur |
| AI Newsletter | Ben's Bites · The Rundown AI · TLDR AI · Latent Space |
| AI 技术 | Simon Willison · Hugging Face · GitHub Trending · r/LocalLLaMA |
| 科技媒体 | VentureBeat · TechCrunch · MIT Technology Review |
| 商业趋势 | Trends.vc · Product Hunt · Hacker News Best |
| AI + 电商 | Shopify Blog · Practical Ecommerce · Marketing AI Institute |
| 中文媒体 | 量子位 · 机器之心 · 36氪 · 少数派 · 晚点 LatePost |
| 微信公众号 | 数字生命卡兹克 · 卡尔的AI沃茨 · 饼干哥哥AGI 等 |

### 切换 AI 模型

编辑 [config.toml](config.toml)，支持任何 OpenAI 兼容 API：

```toml
# DeepSeek（默认，便宜好用）
[api]
base_url = "https://api.deepseek.com"
scoring_model = "deepseek-v4-flash"

# OpenAI
[api]
base_url = "https://api.openai.com/v1"
scoring_model = "gpt-4o-mini"

# Ollama（本地运行，完全免费）
[api]
base_url = "http://localhost:11434/v1"
scoring_model = "qwen2.5:14b"
api_key = "ollama"
score_workers = 1
```

> ⚠️ 使用 OpenRouter 等第三方 API 时，`base_url` 必须包含 `/api/v1`，否则 OpenAI SDK 会解析失败。

### 完整配置项

所有配置都在 [config.toml](config.toml) 里：

```toml
[api]
api_key = ""                          # 或用环境变量 API_KEY
base_url = "https://api.deepseek.com" # API 地址
scoring_model = "deepseek-v4-flash"   # 评分用的模型
summary_model = "deepseek-v4-flash"   # 摘要/洞察用的模型
price_in_per_m = 0.14                 # 输入 token 价格（$/百万 token）
price_out_per_m = 0.28                # 输出 token 价格（$/百万 token）

[pipeline]
lookback_days = 1                     # 抓最近几天的内容
dedup_window_days = 90                # 历史去重窗口（天）
content_cap = 4000                    # 每篇文章最多取多少字符
output_dir = "output"                 # 输出目录
history_path = "data/pushed.json"     # 历史记录文件
feed_health_path = "data/feed_health.json"  # Feed 健康监控文件
fetch_timeout = 15                    # RSS 抓取超时（秒）
fetch_workers = 8                     # 同时抓几个源
score_workers = 4                     # 同时评几篇
log_level = "INFO"                    # 日志级别（DEBUG/INFO/WARNING）
```

环境变量会覆盖 config.toml 的值，适合 CI 和密钥管理：

| 环境变量 | 作用 |
|----------|------|
| `API_KEY` | API 密钥 |
| `BASE_URL` | API 地址 |
| `SCORING_MODEL` | 评分模型 |
| `SUMMARY_MODEL` | 摘要模型 |
| `LOOKBACK_DAYS` | 回溯天数 |

---

## 评分机制

每篇文章由 AI 打 0-10 分，核心标准是**信息密度 × 可操作性**：

- **有具体数字/产品名/技术名** → 有信息密度
- **读完能做某件事或做更好的判断** → 有可操作性
- 泛泛观点、营销软文、无数据的预测 → 直接 ≤4 分

**保留门槛**：≥5 分（GitHub Trending 来源 ≥4 分）且主题相关。

同一事件如果被多个来源报道，只保留得分最高的那篇（先用标题 Jaccard 相似度粗筛，疑似重复才送 AI 精确判断）。

各主题的详细评分标准见 [PROMPTS.md](PROMPTS.md)。

---

## 核心功能详解

### 趋势检测

`src/trends.py` 基于 LLM 标签进行跨源聚类，识别同一主题被多个来源报道的信号：

- 自动提取每篇文章的 LLM 标签
- 统计同一标签在不同来源的出现次数
- 输出趋势信号：`trend_signal`（是否命中）、`trend_topic`（趋势主题）、`trend_source_count`（涉及源数）、`trend_confidence`（置信度：high/medium/low）

### 构建方向提炼（BuilderPulse）

`src/insights.py` 用 last30days 全局搜索社区真实讨论数据，反向匹配今日文章：

1. 调用 last30days 搜索 Reddit/Hacker News 过去 30 天的讨论
2. 按讨论热度挑出 top 2 篇文章
3. 只有持续趋势才生成构建建议，过滤一日游热点
4. LLM 生成恰好 2 个具体可做的项目，每个包含：
   - 产品名、描述、目标用户
   - 核心功能、变现模式
   - 难度评级（easy/medium/hard）
   - MVP 预估天数

前端通过 `BuildDirections` 组件展示，带难度徽章和趋势标签。

### AI 评语（Why Now）

对评分 ≥ 7 的文章，LLM 自动生成时效性解释——"为什么这条信息现在值得关注"。在前端以 `💡 AI 评语` 形式展示。

### 中英双语摘要

每篇入选文章同时生成中文和英文摘要，Web 前端支持一键切换语言。

### 社媒文案生成

自动生成 X/Twitter 发帖文案：
- 中英双语短帖（280 字符以内）
- X Thread（3-5 条推文，hook → 亮点 → CTA）
- 可通过 `publish.py` 手动发帖（需配置 xurl）

---

## 成本优化

项目内置多层成本控制：

| 机制 | 说明 |
|------|------|
| **规则预筛选** | 自动过滤标题 < 5 字符、内容 < 100 字符且无关键词的文章，节省 LLM 调用 |
| **150+ 关键词** | 覆盖 AI 技术、商业模式、增长获客、用户痛点、产品构建、电商、开源、行业场景 |
| **Jaccard 去重** | 标题相似度 > 0.4 才送 LLM 精确判断，否则直接跳过 |
| **90 天历史去重** | 已推送过的文章不会重复评分 |
| **内容截断** | 每篇文章最多 4000 字符，控制输入 token |

实测单次运行成本约 **$0.01-0.02**（DeepSeek V4 Flash）。

---

## 可靠性

### 自动重试

API 调用失败时自动重试：
- 429 (Rate Limit) → 重试 3 次，指数退避（2s, 4s）
- 5xx / 超时 → 重试 3 次
- 401 (Auth) → 直接报错，不重试

### Feed 健康监控

系统自动追踪每个 feed 的运行状态，记录到 `data/feed_health.json`：
- 最后成功/失败时间
- 连续失败次数
- 累计文章数

连续失败 ≥ 3 次的 feed 会在运行时发出 WARNING 提醒，方便你及时替换失效源。

### 空跑保护

当 0 篇文章通过质量筛选时，`main.py` 直接 `sys.exit(0)`，不覆盖 `latest.json`。确保前端不会因为空跑而丢失上一期的文章和构建方向。

---

## 项目结构

```
ai-daily-pulse/
├── main.py                      # 入口：抓取 → 去重 → 评分 → 趋势 → 洞察 → 写出
├── config.toml                  # AI 模型与管线参数
├── feeds.toml                   # RSS 信息源列表（47 个）
├── requirements.txt             # Python 依赖
├── PROMPTS.md                   # 评分与摘要 prompt 说明
│
├── src/                         # Python 管线
│   ├── config.py                # 配置加载（env 可覆盖）
│   ├── feeds.py                 # RSS 抓取、内容清理、规则预筛选
│   ├── feed_health.py           # Feed 健康监控
│   ├── history.py               # URL 历史去重（90 天窗口）
│   ├── scorer.py                # AI 评分、Jaccard 去重、中英摘要、why_now、重试
│   ├── trends.py                # 趋势检测：LLM 标签跨源聚类
│   ├── insights.py              # 构建方向提炼 + 社媒文案生成
│   └── writer.py                # 输出 Markdown + digest JSON
│
├── web/                         # Next.js 16 前端
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx       # 顶栏、搜索、日期切换、多语言、暗色模式
│   │   │   ├── page.tsx         # 首页：今日脉搏 + 精选
│   │   │   ├── [date]/page.tsx  # 历史日期页面
│   │   │   ├── builder/page.tsx # Builder：可做项目（折叠卡片）
│   │   │   ├── builder/[date]/page.tsx  # Builder 历史日期
│   │   │   ├── explore/page.tsx # 探索：主题筛选
│   │   │   ├── item/[date]/[id]/page.tsx  # 文章详情
│   │   │   └── about/page.tsx   # 关于页面
│   ├── components/              # ProjectCard、BuildDirections、SummaryBlock 等 15 个组件
│   └── lib/
│       ├── api.ts               # 读取 ../output/*.json
│       └── types.ts             # DigestItem / DailyDigest / BuildProject 类型
│
├── output/                      # 管线产出（CI 每日提交）
│   ├── AI Daily - YYYY-MM-DD.md # Obsidian 日报
│   ├── digest-YYYY-MM-DD.json   # Web 用结构化数据（含趋势、构建方向、社媒文案）
│   └── latest.json              # 最近一日 digest 副本
│
├── data/
│   ├── pushed.json              # 已推送 URL 记录
│   └── feed_health.json         # Feed 健康状态
│
├── tests/                       # 80 个 pytest 测试
│   ├── test_config.py           # 6 个
│   ├── test_feeds.py            # 12 个
│   ├── test_feed_health.py      # 10 个
│   ├── test_history.py          # 16 个
│   ├── test_scorer.py           # 19 个
│   ├── test_trends.py           # 6 个
│   ├── test_writer.py           # 10 个
│   └── test_smoke.py            # 1 个
│
├── examples/                    # 示例日报
└── .github/workflows/
    ├── daily.yml                # 每日 09:00（北京时间）自动运行
    └── deploy.yml               # 手动部署（workflow_dispatch，备用）
```

---

## Pipeline 架构

```
fetch (并发8) → prefilter (规则) → history dedup (URL) → score (并发4) → dedup (Jaccard+LLM) → summarize_zh (并发4) → summarize_en (并发4) → why_now (score>=7) → trend_detect (tags) → insights (build directions + social posts) → write
```

---

## 技术栈

**管线**

- **Python 3.11+** + feedparser + OpenAI SDK
- **GitHub Actions** 定时调度（每天北京时间 09:00）
- **logging** 结构化日志（DEBUG / INFO / WARNING）

**展示**

- **Next.js 16** + React 19 + TypeScript + Tailwind（`web/`）
- **next-intl** 多语言（zh-CN / zh-TW / en）
- **Cloudflare Pages** 托管（`ai-daily-pulse.top`）
- **Obsidian Git** 同步 Markdown 日报（可选）

---

## License

MIT
