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

# Run tests
pytest

# Run a single test
pytest tests/test_history.py::test_filter_unseen_skips_recent_match
```

## Architecture

Pipeline: **fetch → history dedup → score → dedup → summarize → write**

1. [main.py](main.py) — Entry point. Loads config, orchestrates the pipeline, manages history file.
2. [src/config.py](src/config.py) — Loads `config.toml` with defaults, overrides with env vars. Single `load_config()` returns a flat dict.
3. [src/feeds.py](src/feeds.py) — Loads `feeds.toml`, fetches RSS entries via feedparser with concurrent workers, filters by lookback window, extracts content.
4. [src/scorer.py](src/scorer.py) — LLM API calls for scoring (JSON mode), deduplication, and summarization with concurrent workers. Uses OpenAI-compatible SDK with configurable `base_url`.
5. [src/writer.py](src/writer.py) — Generates Obsidian Markdown with YAML frontmatter, grouped by topic in a fixed order. Also writes rejected-article log.
6. [src/history.py](src/history.py) — Manages `data/pushed.json` for 90-day URL dedup window. Pure functions, no side effects except file I/O in `save_history`.
7. [feeds.toml](feeds.toml) — All feed sources. Each entry has `name`, `url`, `lang` (en/zh).
8. [config.toml](config.toml) — AI model and pipeline configuration. See "Configuration" below.
9. [data/pushed.json](data/pushed.json) — History file tracking pushed URLs with timestamps. Auto-pruned to 90-day window.

## Configuration

All AI and pipeline settings live in `config.toml`. Env vars override config file values.

Key fields:
- `api.api_key` — API key (env: `API_KEY`)
- `api.base_url` — API endpoint (default: `https://api.deepseek.com`)
- `api.scoring_model` / `api.summary_model` — Model IDs (default: `deepseek-v4-flash`)
- `pipeline.fetch_workers` — RSS concurrency (default: 8)
- `pipeline.score_workers` — Scoring concurrency (default: 4)

Works with any OpenAI-compatible API: DeepSeek, OpenAI, Ollama, etc.

## Scoring System

- Articles scored 0-10 by configured LLM using topic-specific rubrics defined in [src/scorer.py](src/scorer.py)
- Keep threshold: score >= 5 (>= 4 for GitHub Trending) AND topic != "无关"
- After scoring, a batch dedup pass removes articles covering the same event (keeps highest-scored)
- Summaries generated only for kept articles
- Full scoring prompt details in [PROMPTS.md](PROMPTS.md)

## Key Design Decisions

- Content capped at 4000 chars per article to control token costs (configurable via `config.toml`)
- Uses OpenAI SDK with configurable `base_url` — works with any OpenAI-compatible provider
- History dedup is URL-based with a 90-day sliding window
- Output is Obsidian-native: YAML frontmatter + inline tags for Dataview queries
- WeWe RSS feeds (微信公众号) often return garbled content; code falls back to title when content < 100 chars
- RSS fetching and article scoring use `concurrent.futures.ThreadPoolExecutor` for parallelism

## Output Format

Files go to `output/AI Daily - YYYY-MM-DD.md`. Articles grouped by topic (fixed order in `TOPIC_ORDER`), sorted by score descending within each group. Each article has: linked title, source, score, tags, and summary. Rejected articles logged to `AI Daily - YYYY-MM-DD - rejected.md`.
