# AI 信息雷达

> 44 个信息源自动抓取 → AI 智能评分 → 生成中文日报，每天早上打开就能看。

---

## 这是什么？

每天有大量 AI 资讯发布在各种平台上，手动刷太累、容易漏。

**AI 信息雷达**帮你自动完成这件事：

1. 从 44 个 RSS 信息源（英文 + 中文）抓取最新文章
2. 用 AI 给每篇文章打分（0-10），只留高质量内容
3. 自动生成中文摘要，输出为 Obsidian 可读的 Markdown 日报

整个过程全自动，你只需要**每天打开看一眼**。

### 关注方向

- OPC / 一人公司 / AI 赚钱案例
- AI + 电商
- AI 工具实操 / Agent 工作流
- AI 新技术 / 新模型
- 投融资动态

---

## 效果长什么样？

每天生成一份 `output/AI Daily - YYYY-MM-DD.md`，打开后是这样的：

```markdown
## OPC/AI赚钱案例

### [40 installs per day to 130. 34 USD per day to 130.](https://reddit.com/...)
- **来源**：Reddit r/SideProject
- **评分**：8/10
- **标签**：`#ASO实战` `#一人公司` `#增长黑客`
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

---

## 5 分钟部署指南

### 第 1 步：Fork 这个仓库

点右上角 **Fork**，把仓库复制到你的 GitHub 账户下。

### 第 2 步：获取 API Key

本项目支持任何兼容 OpenAI 格式的 API（DeepSeek、OpenAI、Ollama 等）。选一个你已有的或去注册一个，拿到 API Key。

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

运行后在 `output/` 目录下会生成两个文件：
- `AI Daily - 2026-05-18.md` — 当天日报
- `AI Daily - 2026-05-18 - rejected.md` — 被淘汰的文章（附评分，方便你检验筛选效果）

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

当前覆盖 44 个来源，按方向分类：

| 方向 | 来源举例 |
|------|----------|
| OPC/创业案例 | Indie Hackers · Reddit r/SideProject · Reddit r/Entrepreneur |
| AI Newsletter | Ben's Bites · The Rundown AI · TLDR AI · Latent Space |
| AI 技术 | Simon Willison · Hugging Face · GitHub Trending · r/LocalLLaMA |
| 科技媒体 | VentureBeat · TechCrunch · MIT Technology Review |
| 商业趋势 | Trends.vc · Product Hunt |
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

### 完整配置项

所有配置都在 [config.toml](config.toml) 里：

```toml
[api]
api_key = ""                          # 或用环境变量 API_KEY
base_url = "https://api.deepseek.com" # API 地址
scoring_model = "deepseek-v4-flash"   # 评分用的模型
summary_model = "deepseek-v4-flash"   # 摘要用的模型
price_in_per_m = 0.14                 # 输入 token 价格（$/百万 token）
price_out_per_m = 0.28                # 输出 token 价格（$/百万 token）

[pipeline]
lookback_days = 1                     # 抓最近几天的内容
dedup_window_days = 90                # 历史去重窗口（天）
content_cap = 4000                    # 每篇文章最多取多少字符
output_dir = "output"                 # 输出目录
history_path = "data/pushed.json"     # 历史记录文件
fetch_timeout = 60                    # RSS 抓取超时（秒）
fetch_workers = 8                     # 同时抓几个源
score_workers = 4                     # 同时评几篇
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

同一事件如果被多个来源报道，只保留得分最高的那篇。

各主题的详细评分标准见 [PROMPTS.md](PROMPTS.md)。

---

## 项目结构

```
ai-daily-pulse/
├── main.py              # 入口文件，运行整个流程
├── config.toml          # AI 模型和运行参数配置
├── feeds.toml           # 信息源列表
├── requirements.txt     # Python 依赖
├── src/
│   ├── config.py        # 读取配置
│   ├── feeds.py         # 抓取 RSS
│   ├── history.py       # 历史去重（90天窗口）
│   ├── scorer.py        # AI 评分 / 去重 / 摘要
│   └── writer.py        # 生成 Markdown 日报
├── output/              # 生成的日报
└── data/
    └── pushed.json      # 已推送的 URL 记录
```

---

## 技术栈

- **Python 3.11+** + feedparser + OpenAI SDK
- **GitHub Actions** 定时调度
- **Obsidian Git** 本地同步（可选）

---

## License

MIT
