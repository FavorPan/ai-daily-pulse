# AI Daily Pulse

[📖 阅读中文版](README.md)

> 🌐 **[ai-daily-pulse.top](https://ai-daily-pulse.top)** — 47 sources auto-fetched → rule-based prefiltering → AI scoring → semantic dedup → trend detection → build direction extraction → bilingual daily digest. Open it every morning and you're caught up.

---

## What Is This?

Every day, a flood of AI news is published across dozens of platforms. Manually keeping up is exhausting and you'll miss things.

**AI Daily Pulse** automates this for you:

1. Fetches the latest articles from 47 RSS sources (English + Chinese)
2. **Rule-based prefiltering**: filters out low-quality articles with too-short titles or too-little content (saves AI call costs)
3. Scores each article 0–10 with AI, keeping only high-quality content
4. **Jaccard title dedup**: coarse similarity screening first, only sends suspicious duplicates to AI for precise judgment
5. **Bilingual summaries**: auto-generates Chinese + English summaries for every selected article
6. **Trend detection**: cross-source clustering based on LLM tags, identifying recurring themes
7. **Build direction extraction**: based on 7-day cumulative trends, auto-generates actionable AI project suggestions (difficulty, MVP days, monetization)
8. **Social media copy**: auto-generates X/Twitter post copy + Thread

The entire process is fully automated. All you need to do is **open it once a day**.

### Focus Areas

- OPC / solopreneur / AI money-making cases (revenue numbers, acquisition paths, cold-start methods)
- AI + e-commerce (product selection, ads, independent stores, workflows)
- AI tool workflows / Agent workflows (reusable prompts, step-by-step guides, open-source projects)
- AI new tech / new models (benchmark data, API pricing, open-source status)
- Investment & funding news (amounts, valuations, investors)

---

## What Does It Look Like?

Each day produces an `output/AI Daily - YYYY-MM-DD.md`. Opening it looks like this:

```markdown
## OPC/AI Money-Making Cases

### [40 installs per day to 130. 34 USD per day to 130.](https://reddit.com/...)
- **Source**: Reddit r/SideProject
- **Score**: 8/10
- **Tags**: `#ASO-tactics` `#solopreneur` `#growth-hacking`
- **AI Insight**: 💡 ASO optimization is currently the most undervalued lever in mobile growth — multiple indie devs sharing similar experiences this week
- **Summary**: A developer increased their app from 40 organic installs/day and $34/day revenue to
  130 installs and $130/day through 5 ASO tweaks. Key changes: adding primary keyword to title,
  rewriting subtitle to be outcome-oriented, showing before/after screenshots on first screen
  (conversion rate +18%)...

## AI New Tech / New Models

### [Gemma 4: The Best Small Multimodal Open-Source Model, Surpassing Gemma 3 Across the Board](https://latent.space/...)
- **Source**: Latent Space
- **Score**: 8/10
- **Tags**: `#open-source-model` `#multimodal`
- **Summary**: ...
```

Grouped by topic, sorted by score — the best content rises to the top.

When the run completes, a summary is printed:

```
=== Run Summary ===
Fetched: 148 → Prefiltered: 69 → After dedup: 8 → Selected: 8
By topic:
  OPC/AI Money-Making Cases: 2
  AI Tool Workflows/Agent Workflows: 2
  AI New Tech/New Models: 2
  AI Investment & Funding: 2
Trend signals: 3 articles hit cross-source themes
Tokens: 76K in / 4.2K out | Cost: $0.012
Duration: 66s total (fetch 6s + scoring 55s + dedup 0s + summary 5s)
```

---

## Web Frontend

Browse the digest online: [**ai-daily-pulse.top**](https://ai-daily-pulse.top)

- **Home**: today's pulse + featured articles
- **Builder**: actionable AI project ideas from 7-day persistent trends, with difficulty rating, MVP days, monetization, and community heat. Cards default collapsed showing key info, click to expand details
- **Explore**: filter by topic, search by keyword
- **Detail**: full summary, AI insight, tags, original link
- **Date switcher**: top bar dropdown to browse historical digests
- **Multilingual**: zh-CN / zh-TW / English
- **Dark mode**: auto-follows system or manual toggle
- **Root path**: `/` auto-redirects to `/zh-CN/`

Hosted on Cloudflare Pages, auto-updated after every GitHub Actions run.

---

## 5-Minute Deployment Guide

### Step 1: Fork this repo

Click **Fork** in the top right to copy the repo to your GitHub account.

### Step 2: Get an API Key

This project supports any OpenAI-compatible API (DeepSeek, OpenAI, OpenRouter, Ollama, etc.). Pick one you already have or sign up for one and get an API Key.

> Recommended: [DeepSeek](https://platform.deepseek.com) — cheap, reliable, and comes with free credits on signup.

### Step 3: Store the API Key on GitHub

Go to your forked repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name | Value |
|------|-------|
| `API_KEY` | Your API Key |

### Step 4: Enable GitHub Actions

Click the **Actions** tab at the top of the repo, then click **"I understand my workflows, go ahead and enable them"**.

**Done.** The pipeline runs automatically every day at 09:00 Beijing time (01:00 UTC). Results are committed to the `output/` directory.

---

## Local Run (Optional)

If you want to run it on your own machine:

```bash
# Clone the repo
git clone https://github.com/your-username/ai-daily-pulse.git
cd ai-daily-pulse

# Install dependencies
pip install -r requirements.txt

# Set API Key (pick one)
export API_KEY=sk-...                 # Option 1: environment variable
# Or edit api.api_key in config.toml  # Option 2: config file

# Run
python main.py

# To fetch multiple days (default: 1 day)
LOOKBACK_DAYS=3 python main.py
```

After running, the `output/` directory will contain:

- `output/AI Daily - YYYY-MM-DD.md` — Obsidian digest
- `output/digest-YYYY-MM-DD.json` — Web frontend data (trends, build directions, social copy)
- `output/latest.json` — points to the most recent digest

---

## Web UI Local Development

```bash
# Make sure digest JSON exists (either ran python main.py or repo already has output/latest.json)
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploy to Cloudflare Pages

The project is deployed on Cloudflare Pages (`ai-daily-pulse.top`). Configuration highlights:

- Project type: **Pages** (not Workers)
- Root directory: `/`
- Build command: `cd web && npm install && npm run build`
- Build output directory: `web/out`
- Environment variables: `NODE_VERSION=20`, `SKIP_DEPENDENCY_INSTALL=true`

You can also deploy to Vercel:

1. Import this GitHub repo
2. Set **Root Directory** to `web`
3. Framework Preset: Next.js (default)
4. Make sure CI daily commits include `output/latest.json` in the repo (pushed by Actions alongside Markdown)

---

## Sync to Obsidian (Optional)

If you use Obsidian for knowledge management, use the [Obsidian Git](https://github.com/denolehov/obsidian-git) plugin for auto-sync:

```bash
# Clone the repo inside your Obsidian vault
cd /path/to/your/vault
git clone https://github.com/your-username/ai-daily-pulse.git "AI Daily"
```

Then install the Obsidian Git plugin (search "Git" in Community Plugins) and configure:

- **Custom base path**: `AI Daily`
- **Pull on startup**: enabled
- **Auto pull interval**: `60` (minutes)

From then on, opening Obsidian will automatically pull the latest digest.

---

## How to Customize

### Add or Remove Sources

Edit [feeds.toml](feeds.toml). Each source follows this format:

```toml
[[feeds]]
name = "Source Name"
url  = "https://example.com/feed.xml"
lang = "zh"  # "zh" for Chinese, "en" for English
```

Currently covers 47 sources across these categories:

| Category | Example Sources |
|----------|----------------|
| OPC/Startup Cases | Indie Hackers · Reddit r/SideProject · Reddit r/Entrepreneur |
| AI Newsletters | Ben's Bites · The Rundown AI · TLDR AI · Latent Space |
| AI Tech | Simon Willison · Hugging Face · GitHub Trending · r/LocalLLaMA |
| Tech Media | VentureBeat · TechCrunch · MIT Technology Review |
| Business Trends | Trends.vc · Product Hunt · Hacker News Best |
| AI + E-commerce | Shopify Blog · Practical Ecommerce · Marketing AI Institute |
| Chinese Media | 量子位 · 机器之心 · 36氪 · 少数派 · 晚点 LatePost |
| WeChat Official Accounts | 数字生命卡兹克 · 卡尔的AI沃茨 · 饼干哥哥AGI and more |

### Switch AI Models

Edit [config.toml](config.toml). Any OpenAI-compatible API is supported:

```toml
# DeepSeek (default, cheap and reliable)
[api]
base_url = "https://api.deepseek.com"
scoring_model = "deepseek-v4-flash"

# OpenAI
[api]
base_url = "https://api.openai.com/v1"
scoring_model = "gpt-4o-mini"

# Ollama (local, completely free)
[api]
base_url = "http://localhost:11434/v1"
scoring_model = "qwen2.5:14b"
api_key = "ollama"
score_workers = 1
```

> ⚠️ When using third-party APIs like OpenRouter, `base_url` must include `/api/v1`, otherwise the OpenAI SDK will fail to parse responses.

### Full Configuration

All config lives in [config.toml](config.toml):

```toml
[api]
api_key = ""                          # Or use API_KEY env var
base_url = "https://api.deepseek.com" # API endpoint
scoring_model = "deepseek-v4-flash"   # Model for scoring
summary_model = "deepseek-v4-flash"   # Model for summaries & insights
price_in_per_m = 0.14                 # Input token price ($/million tokens)
price_out_per_m = 0.28                # Output token price ($/million tokens)

[pipeline]
lookback_days = 1                     # How many days back to fetch
dedup_window_days = 90                # History dedup window (days)
content_cap = 4000                    # Max characters per article
output_dir = "output"                 # Output directory
history_path = "data/pushed.json"     # History record file
feed_health_path = "data/feed_health.json"  # Feed health monitoring file
fetch_timeout = 15                    # RSS fetch timeout (seconds)
fetch_workers = 8                     # Concurrent fetch workers
score_workers = 4                     # Concurrent scoring workers
log_level = "INFO"                    # Log level (DEBUG/INFO/WARNING)
```

Environment variables override config.toml values, ideal for CI and secret management:

| Env Variable | Purpose |
|--------------|---------|
| `API_KEY` | API key |
| `BASE_URL` | API endpoint |
| `SCORING_MODEL` | Scoring model |
| `SUMMARY_MODEL` | Summary model |
| `LOOKBACK_DAYS` | Lookback days |

---

## Scoring System

Each article is scored 0–10 by AI. The core criteria are **information density × actionability**:

- **Has specific numbers / product names / tech names** → information density
- **After reading, you can do something or make a better decision** → actionability
- Vague opinions, marketing fluff, predictions without data → ≤ 4

**Retention threshold**: ≥ 5 (≥ 4 for GitHub Trending) and topic is relevant.

When the same event is covered by multiple sources, only the highest-scoring article is kept (Jaccard title similarity screening first, then AI precise judgment for suspicious duplicates).

Detailed per-topic scoring rubrics are in [PROMPTS.md](PROMPTS.md).

---

## Core Features in Detail

### Trend Detection

`src/trends.py` performs cross-source clustering based on LLM tags to identify themes reported across multiple sources:

- Automatically extracts LLM tags from each article
- Counts occurrences of the same tag across different sources
- Outputs trend signals: `trend_signal` (hit or not), `trend_topic` (trend theme), `trend_source_count` (number of sources), `trend_confidence` (high/medium/low)

### Build Direction Extraction (BuilderPulse)

`src/insights.py` doesn't just look at what's hot today — it analyzes **themes that have persisted over the past 7 days**:

1. Loads the past 7 days of digest JSON
2. Identifies tags that have appeared for 7+ consecutive days
3. Only persistent trends generate build suggestions — filters out one-day-wonder hype
4. LLM generates exactly 2 concrete, actionable projects, each with:
   - Product name, description, target user
   - Core features, monetization model
   - Difficulty rating (easy/medium/hard)
   - Estimated MVP days

The frontend displays these via the `BuildDirections` component, with difficulty badges and trend labels.

### AI Insight (Why Now)

For articles scored ≥ 7, the LLM auto-generates a timeliness explanation — "why this information matters right now." Displayed as `💡 AI Insight` in the frontend.

### Bilingual Summaries

Every selected article gets both a Chinese and English summary. The web frontend supports one-click language switching.

### Social Media Copy Generation

Auto-generates X/Twitter post copy:
- Bilingual short posts (within 280 characters)
- X Threads (3–5 tweets: hook → highlights → CTA)
- Can be manually posted via `publish.py` (requires xurl configured)

---

## Cost Optimization

The project has multiple built-in layers of cost control:

| Mechanism | Description |
|-----------|-------------|
| **Rule-based prefiltering** | Auto-filters articles with titles < 5 chars or content < 100 chars with no keywords — saves LLM calls |
| **150+ keywords** | Covers AI tech, business models, growth/acquisition, user pain points, product building, e-commerce, open-source, industry scenarios |
| **Jaccard dedup** | Only sends articles with title similarity > 0.4 to LLM for precise judgment; others skip |
| **90-day history dedup** | Previously pushed articles won't be re-scored |
| **Content truncation** | Max 4000 chars per article to control input tokens |

Measured single-run cost is approximately **$0.01–0.02** (DeepSeek V4 Flash).

---

## Reliability

### Automatic Retry

API call failures trigger automatic retries:
- 429 (Rate Limit) → retry 3 times, exponential backoff (2s, 4s)
- 5xx / timeout → retry 3 times
- 401 (Auth) → fail immediately, no retry

### Feed Health Monitoring

The system automatically tracks each feed's status, recorded to `data/feed_health.json`:
- Last success / failure time
- Consecutive failure count
- Cumulative article count

Feeds with ≥ 3 consecutive failures emit a WARNING at runtime, helping you replace dead sources promptly.

### Empty-Run Protection

When 0 articles pass quality filtering, `main.py` exits with `sys.exit(0)` without overwriting `latest.json`. This ensures the frontend doesn't lose the previous day's articles and build directions due to an empty run.

---

## Project Structure

```
ai-daily-pulse/
├── main.py                      # Entry: fetch → dedup → score → trends → insights → write
├── config.toml                  # AI model and pipeline parameters
├── feeds.toml                   # RSS source list (47 sources)
├── requirements.txt             # Python dependencies
├── PROMPTS.md                   # Scoring and summary prompt documentation
│
├── src/                         # Python pipeline
│   ├── config.py                # Config loading (env overrides)
│   ├── feeds.py                 # RSS fetch, content cleaning, rule-based prefiltering
│   ├── feed_health.py           # Feed health monitoring
│   ├── history.py               # URL history dedup (90-day window)
│   ├── scorer.py                # AI scoring, Jaccard dedup, bilingual summaries, why_now, retries
│   ├── trends.py                # Trend detection: LLM tag cross-source clustering
│   ├── insights.py              # Build direction extraction + social media copy generation
│   └── writer.py                # Markdown + digest JSON output
│
├── web/                         # Next.js 16 frontend
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx       # Top bar, search, date switcher, multilingual, dark mode
│   │   │   ├── page.tsx         # Home: today's pulse + featured
│   │   │   ├── [date]/page.tsx  # Historical date page
│   │   │   ├── builder/page.tsx # Builder: buildable projects (collapsible cards)
│   │   │   ├── builder/[date]/page.tsx  # Builder historical date
│   │   │   ├── explore/page.tsx # Explore: topic filtering
│   │   │   ├── item/[date]/[id]/page.tsx  # Article detail
│   │   │   └── about/page.tsx   # About page
│   ├── components/              # ProjectCard, BuildDirections, SummaryBlock, etc. (15 components)
│   └── lib/
│       ├── api.ts               # Reads ../output/*.json
│       └── types.ts             # DigestItem / DailyDigest / BuildProject types
│
├── output/                      # Pipeline output (CI daily commit)
│   ├── AI Daily - YYYY-MM-DD.md # Obsidian digest
│   ├── digest-YYYY-MM-DD.json   # Structured data for web (trends, build directions, social copy)
│   └── latest.json              # Most recent digest copy
│
├── data/
│   ├── pushed.json              # Pushed URL records
│   └── feed_health.json         # Feed health status
│
├── tests/                       # 80 pytest tests
│   ├── test_config.py           # 6
│   ├── test_feeds.py            # 12
│   ├── test_feed_health.py      # 10
│   ├── test_history.py          # 16
│   ├── test_scorer.py           # 19
│   ├── test_trends.py           # 6
│   ├── test_writer.py           # 10
│   └── test_smoke.py            # 1
│
├── examples/                    # Example digests
└── .github/workflows/
    ├── daily.yml                # Daily 09:00 Beijing time auto-run
    └── deploy.yml               # Manual deploy (workflow_dispatch, backup)
```

---

## Pipeline Architecture

```
fetch (8 concurrent) → prefilter (rules) → history dedup (URL) → score (4 concurrent) → dedup (Jaccard+LLM) → summarize_zh (4 concurrent) → summarize_en (4 concurrent) → why_now (score≥7) → trend_detect (tags) → insights (build directions + social posts) → write
```

---

## Tech Stack

**Pipeline**

- **Python 3.11+** + feedparser + OpenAI SDK
- **GitHub Actions** scheduled execution (daily 09:00 Beijing time)
- **logging** structured logging (DEBUG / INFO / WARNING)

**Frontend**

- **Next.js 16** + React 19 + TypeScript + Tailwind (`web/`)
- **next-intl** multilingual (zh-CN / zh-TW / en)
- **Cloudflare Pages** hosting (`ai-daily-pulse.top`)
- **Obsidian Git** for syncing Markdown digests (optional)

---

## License

MIT
