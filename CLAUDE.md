# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI 信息雷达 (AI Info Aggregator) — a Python pipeline that fetches articles from 43+ RSS feeds, scores them with an LLM, deduplicates, generates Chinese summaries, and outputs Obsidian-compatible daily digest Markdown files.

**Key audience focus:** OPC/solo-founder AI money-making cases, AI+ecommerce, AI tool workflows, AI new tech/models, and funding rounds.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run the full pipeline (requires API key via env var or config.toml)
export API_KEY=sk-...
python main.py

# Run with custom lookback window (default: 1 day)
LOOKBACK_DAYS=3 python main.py

# Run tests (80 tests across 8 files)
pytest

# Run a single test
pytest tests/test_history.py::test_filter_unseen_skips_recent_match

# Web frontend local dev (requires digest JSON in output/)
cd web && npm install && npm run dev
# Opens at http://localhost:3000
```

## Architecture

Full pipeline: **fetch → prefilter (rules) → history dedup (URL) → score (LLM, concurrent) → dedup (Jaccard + LLM) → summarize_zh (concurrent) → summarize_en (concurrent) → why_now (score ≥ 7) → trend detection (tags clustering) → insights (build directions + social posts) → write (Markdown + JSON)**

1. [main.py](main.py) — Entry point. Loads config, orchestrates the pipeline, prints run summary with timing breakdown.
2. [src/config.py](src/config.py) — Loads `config.toml` with defaults, overrides with env vars. Single `load_config()` returns a flat dict.
3. [src/feeds.py](src/feeds.py) — Loads `feeds.toml`, fetches RSS via feedparser with concurrent workers (ThreadPoolExecutor), filters by lookback window, extracts and cleans HTML content. Also performs rule-based prefiltering: drops titles < 5 chars, content < 100 chars without AI keywords.
4. [src/feed_health.py](src/feed_health.py) — Tracks per-feed health in `data/feed_health.json`: last success/failure time, consecutive failures, cumulative article count. WARNING logged when ≥ 3 consecutive failures.
5. [src/history.py](src/history.py) — Manages `data/pushed.json` for 90-day URL dedup window. Pure functions, no side effects except file I/O in `save_history`.
6. [src/scorer.py](src/scorer.py) — Core LLM interactions: scoring (JSON mode with topic-specific rubrics), Jaccard title dedup pre-filter (threshold 0.4), LLM precise dedup, Chinese summaries, English summaries, and "why now" commentary (for score ≥ 7). All with retry logic (3 attempts, exponential backoff). Uses OpenAI-compatible SDK with configurable `base_url`.
7. [src/trends.py](src/trends.py) — Trend detection via LLM tag cross-source clustering. Builds keyword→source mapping from article tags, flags keywords appearing in ≥ 3 distinct sources as "strong signals." Assigns confidence levels: high (5+), medium (3+), low.
8. [src/insights.py](src/insights.py) — Two sub-features:
   - **Build directions:** Calls last30days CLI to search Reddit/HN for community discussion data matching today's articles, picks top 2 by engagement, generates project suggestions via LLM (with difficulty, MVP days, monetization).
   - **Social posts:** Generates bilingual X/Twitter posts (≤ 280 chars) and X Thread (3-5 tweets) via LLM.
9. [src/writer.py](src/writer.py) — Generates Obsidian Markdown (`AI Daily - YYYY-MM-DD.md`) grouped by topic in `TOPIC_ORDER`, plus structured JSON digest (`digest-YYYY-MM-DD.json` + `latest.json`) for the web frontend. Article IDs are SHA-256 URL hashes (12-char hex).
10. [feeds.toml](feeds.toml) — All feed sources (~47). Each entry has `name`, `url`, `lang` (en/zh).
11. [config.toml](config.toml) — AI model, pipeline, and last30days configuration. See "Configuration" below.
12. [data/pushed.json](data/pushed.json) — History file tracking pushed URLs with timestamps. Auto-pruned to 90-day window.
13. [data/feed_health.json](data/feed_health.json) — Per-feed health metrics updated on each run.

## Configuration

All AI and pipeline settings live in `config.toml`. Env vars override config file values.

Key fields:
- `api.api_key` — API key (env: `API_KEY`)
- `api.base_url` — API endpoint (default: `https://api.deepseek.com`)
- `api.scoring_model` / `api.summary_model` — Model IDs (default: `deepseek-v4-flash`)
- `api.price_in_per_m` / `api.price_out_per_m` — Token pricing for cost calculation
- `pipeline.fetch_workers` — RSS concurrency (default: 8)
- `pipeline.score_workers` — Scoring/summary concurrency (default: 4)
- `pipeline.dedup_window_days` — History dedup window (default: 90)
- `pipeline.content_cap` — Max chars per article sent to LLM (default: 4000)
- `pipeline.fetch_timeout` — RSS request timeout in seconds (default: 15)
- `last30days_enabled` — Enable community discussion search (default: false, requires last30days CLI)
- `last30days_engine_path` / `last30days_python_path` / `last30days_timeout` / `last30days_search_sources` — last30days subprocess config

Works with any OpenAI-compatible API: DeepSeek, OpenAI, Ollama, etc.

## Scoring System

- Articles scored 0-10 by configured LLM using topic-specific rubrics defined in [src/scorer.py](src/scorer.py)
- Keep threshold: score >= 5 (>= 4 for GitHub Trending) AND topic != "无关"
- After scoring, a batch dedup pass removes articles covering the same event (keeps highest-scored)
- **Jaccard pre-filter**: title similarity > 0.4 before sending to LLM for precise dedup
- Summaries generated for kept articles in both Chinese and English
- "Why now" commentary generated for articles scoring ≥ 7
- Full scoring prompt details in [PROMPTS.md](PROMPTS.md)

## Trend Detection

[src/trends.py](src/trends.py) detects cross-source signals without LLM calls:

1. Extracts keywords from LLM-assigned tags for each article
2. Builds keyword→source mapping across all kept articles
3. Keywords appearing in ≥ 3 distinct sources → strong signal
4. Confidence levels: high (5+ sources), medium (3+), low (2)
5. Annotates articles with `trend_signal`, `trend_topic`, `trend_source_count`, `trend_confidence`

## Build Directions & Insights

[src/insights.py](src/insights.py) generates two outputs:

**Build directions** (BuilderPulse): When `last30days_enabled=true`, calls the last30days CLI to search Reddit/HN for community discussions matching today's articles. Picks top 2 by engagement, generates project suggestions with difficulty, MVP days, and monetization strategy. Falls back to sorting by `trend_source_count + score` if last30days is unavailable.

**Social media posts**: Generates bilingual X/Twitter posts (≤ 280 chars) and X Thread (3-5 tweets) from the top scored articles.

## Output Format

Two output formats per run:

1. **Markdown** (`output/AI Daily - YYYY-MM-DD.md`): Obsidian-compatible with YAML frontmatter. Articles grouped by topic (fixed order in `TOPIC_ORDER`), sorted by score descending. Each article has: linked title, source, score, tags, bilingual summary, why_now commentary, and trend signals.

2. **JSON digest** (`output/digest-YYYY-MM-DD.json` + `output/latest.json`): Structured data for the Next.js web frontend. Includes articles, build directions, social posts, and X thread. Article IDs are SHA-256 URL hashes (12-char hex).

Rejected articles are tracked in-memory only (no separate rejected file). Empty runs (0 articles passing quality filter) exit without overwriting `latest.json`.

## Web Frontend

Next.js 16 + React 19 + TypeScript + Tailwind CSS in `web/`. Served on Cloudflare Pages at `ai-daily-pulse.top`.

Key pages:
- `[locale]/page.tsx` — Daily pulse + featured articles
- `[locale]/builder/page.tsx` — Build directions with collapsible project cards
- `[locale]/explore/page.tsx` — Topic filtering + keyword search
- `[locale]/item/[date]/[id]/page.tsx` — Full article detail
- `[locale]/[date]/page.tsx` — Historical dates

Features: zh-CN/zh-TW/en i18n (next-intl), dark mode, date picker, URL-based routing with locale prefix. Root `/` redirects to `/zh-CN/`.

Data flow: frontend reads `output/digest-*.json` and `output/latest.json` via `web/lib/api.ts`. Static generation for the latest day, dynamic rendering for historical dates.

## CI/CD

- `.github/workflows/daily.yml` — Runs at 09:00 Beijing time (01:00 UTC). Full pipeline, commits `output/` back to repo. Timeout: 60 min.
- `.github/workflows/deploy.yml` — Manual deploy trigger (`workflow_dispatch`), backup for Cloudflare Pages auto-deploy.

## Key Design Decisions

- Content capped at 4000 chars per article to control token costs (configurable via `config.toml`)
- Uses OpenAI SDK with configurable `base_url` — works with any OpenAI-compatible provider
- History dedup is URL-based with a 90-day sliding window
- Output is Obsidian-native: YAML frontmatter + inline tags for Dataview queries
- WeWe RSS feeds (微信公众号) often return garbled content; code falls back to title when content < 100 chars
- RSS fetching and article scoring use `concurrent.futures.ThreadPoolExecutor` for parallelism
- LLM calls have 3-attempt retry with exponential backoff (2s, 4s). 429, 5xx, and connection errors are retried; 401 fails immediately.
- Pre-filter drops articles with titles < 5 chars or content < 100 chars without AI keywords (150+ keyword list in `AI_KEYWORDS`)
- Same-day URL dedup in `main.py` keeps highest-scored article per URL
- `latest.json` is never overwritten when 0 articles pass quality filters (empty-run protection)
