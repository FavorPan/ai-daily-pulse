<p align="center">
  <a href="README.md">English</a> · <a href="README-zh.md">中文</a>
</p>

<p align="center">
  <img src="web/public/logo.png" width="160" alt="AI Daily Pulse">
</p>

# AI Daily Pulse

> 🌐 **[ai-daily-pulse.top](https://ai-daily-pulse.top)** — 51 RSS feeds → AI scoring → semantic dedup → trend detection → build directions → bilingual daily digest. Open once a day, read only what matters.

---

## What is this?

Every day, massive amounts of AI news is published across platforms. Manually keeping up is exhausting and you'll miss things.

**AI Daily Pulse** automates this:

1. Fetches from 51 RSS sources (English + Chinese)
2. **Full-text extraction**: when RSS content is thin (< 400 chars), falls back to trafilatura to fetch the full article body
3. **Rule-based prefiltering**: drops low-quality articles (saves AI costs)
4. AI scores each article (0-10), keeps only high-quality content
5. **Jaccard title dedup**: coarse similarity check before LLM precise dedup
6. **Bilingual summaries**: Chinese + English summaries for every article
7. **why_now anti-hallucination**: lightweight fact-token grounding check blanks commentary that isn't backed by source content (zero extra LLM cost)
8. **Trend detection**: cross-source clustering based on LLM tags
9. **Digest quotas**: per-topic and total caps keep the daily digest balanced (no single topic flooding)
10. **Build directions (Insight)**: AI-generated project ideas with difficulty, MVP days, monetization — community-voted
11. **Social media copy**: auto-generated X/Twitter posts + Threads

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
| **Insight** | All-time build directions with community voting (Good / Maybe / Don't), 30 per page |
| **Detail** | Full article summary, AI commentary, tags, source link |
| **About** | Project background & author info |

### Features

- **Insight Voting**: Sign in with GitHub / Google / Email to vote on project ideas. One vote per idea per user.
- **Date Range Picker**: Filter articles and ideas by date range (replaces old date dropdown)
- **i18n**: zh-CN / zh-TW / English (default: English)
- **Dark mode**: auto-follows system or manual toggle
- **Pagination**: Explore 15/page, Insight 30/page
- **Responsive**: two-column card layout on desktop

---

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
max_concurrency = 0                  # 0 = unlimited; set >0 to cap in-flight LLM calls (eases 429s)

[pipeline]
lookback_days = 1
dedup_window_days = 90
content_cap = 4000
output_dir = "output"
fetch_timeout = 15                   # mirror of [timeouts].fetch (kept for back-compat)
fetch_workers = 8
score_workers = 4

[timeouts]                           # unified timeout config (prefix-mapped)
fetch = 15                           # RSS fetch
extract = 20                         # trafilatura full-text extraction
llm = 60                             # LLM API calls

[digest]                             # daily digest quotas
max_per_topic = 8                    # cap articles per topic (score desc)
min_per_topic = 1                    # guarantee minimum if available
max_total = 60                       # global cap, truncate by score desc

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
| `LLM_MAX_CONCURRENCY` | Cap in-flight LLM calls (0 = unlimited) |
| `TIMEOUTS_FETCH` / `TIMEOUTS_EXTRACT` / `TIMEOUTS_LLM` | Per-stage timeouts (seconds) |
| `DIGEST_MAX_PER_TOPIC` / `DIGEST_MIN_PER_TOPIC` / `DIGEST_MAX_TOTAL` | Digest quotas |
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
| Full-text extraction | Only triggered when RSS content < 400 chars (avoids unnecessary fetches) |
| Jaccard dedup | Title similarity > 0.4 before LLM check |
| 90-day history dedup | Already-pushed URLs are skipped |
| Content cap | 4000 chars max per article |
| why_now fact-check | Regex-based grounding check, no extra LLM call |
| LLM concurrency cap | Optional semaphore (default off) proactively reduces 429 storms |

Typical cost per run: **~$0.01-0.02** (DeepSeek V4 Flash).

---

## Reliability

- **tenacity retry**: exponential backoff for 429/5xx/timeout (401 fails immediately); 429s are retried, and the optional concurrency semaphore proactively reduces their occurrence
- **Provider fallback**: configurable primary → fallback model/base_url so a single provider outage doesn't kill the run
- **Atomic writes**: all output files written via temp-file + atomic rename, so a crashed run can't leave a half-written digest
- **Pydantic score validation**: LLM scoring responses are schema-validated before use, rejecting malformed JSON
- **Feed health monitoring**: tracks per-feed success/failure, warns at ≥ 3 consecutive failures
- **Empty run protection**: 0 articles passing quality filter → exits without overwriting `latest.json`
- **Same-day URL dedup**: keeps the highest-scored article per URL within a single run

---

## Project Structure

```
ai-daily-pulse/
├── main.py                      # Entry: fetch → dedup → score → trends → insights → write
├── config.toml                  # AI model & pipeline config
├── feeds.toml                   # RSS feed list (51 sources)
├── requirements.txt             # Python dependencies
│
├── src/                         # Python pipeline
│   ├── config.py                # Config loader (env overrides, section prefixes)
│   ├── models.py                # Pydantic ContentItem + ScoreResult models
│   ├── llm.py                   # LLMClient: retry, provider fallback, concurrency semaphore
│   ├── scrapers/                # Scraper abstraction
│   │   ├── base.py              # BaseScraper interface
│   │   └── rss.py               # RSS fetch + trafilatura full-text fallback
│   ├── feeds.py                 # Feed loading + concurrent fetch orchestration
│   ├── feed_health.py           # Feed health monitoring
│   ├── history.py               # URL history dedup (90-day window)
│   ├── dedup.py                 # Jaccard + LLM precise dedup
│   ├── scorer.py                # AI scoring, bilingual summaries, why_now + fact-check
│   ├── trends.py                # Trend detection: LLM tag cross-source clustering
│   ├── insights.py              # Build directions + social media copy (bilingual)
│   ├── file_utils.py            # Atomic write helpers
│   ├── sync_insights.py         # Sync directions to Worker API
│   └── writer.py                # Digest JSON output + quota enforcement
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
fetch (8 concurrent) → fulltext extract (if content thin) → prefilter (rules) → history dedup (URL) → score (4 concurrent) → dedup (Jaccard+LLM) → summarize_zh (4 concurrent) → summarize_en (4 concurrent) → why_now (score≥7, fact-checked) → trend_detect (tags) → insights (build directions + social posts) → write (JSON, quota-enforced) → sync to Worker API
```

---

## Tech Stack

**Pipeline**: Python 3.11+ · feedparser · OpenAI SDK · GitHub Actions

**Frontend**: Next.js 16 · React 19 · TypeScript · Tailwind CSS · next-intl

**Backend API**: Cloudflare Workers · Hono · D1 (SQLite) · JWT (jose) · Resend (email)

---

## License

MIT
