#!/usr/bin/env python3
import logging
import sys
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from src.config import load_config
from src.feeds import fetch_all
from src.feed_health import check_feed_health, load_feed_health, save_feed_health
from src.history import (
    filter_unseen,
    load_history,
    prune_history,
    record_pushed,
    save_history,
)
from src.scorer import process_articles
from src.writer import write_digest_json, write_output

logger = logging.getLogger(__name__)


def _setup_logging(level_name: str) -> None:
    level = getattr(logging, level_name.upper(), logging.INFO)
    fmt = "[%(asctime)s] %(levelname)s %(message)s"
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(fmt, datefmt="%H:%M:%S"))
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)


def main():
    cfg = load_config()
    _setup_logging(cfg["log_level"])

    api_key = cfg["api_key"]
    if not api_key:
        logger.error("API key not set. Set API_KEY env var or api.api_key in config.toml.")
        sys.exit(1)

    lookback_days = cfg["lookback_days"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    logger.info("=== AI Info Aggregator ===")
    logger.info("Model: %s | Base URL: %s", cfg['scoring_model'], cfg['base_url'])
    logger.info("Lookback: %d day(s) | Dedup window: %d day(s)", lookback_days, cfg['dedup_window_days'])

    t_start = time.monotonic()

    logger.info("[Fetching RSS feeds...]")
    t_fetch = time.monotonic()
    articles, feed_results = fetch_all(
        "feeds.toml",
        lookback_days=lookback_days,
        timeout=cfg["fetch_timeout"],
        content_cap=cfg["content_cap"],
        workers=cfg["fetch_workers"],
    )
    t_fetch = time.monotonic() - t_fetch
    fetched_count = len(articles)
    logger.info("Total fetched: %d articles", fetched_count)

    # Feed health monitoring
    health_path = cfg.get("feed_health_path", "data/feed_health.json")
    health = load_feed_health(health_path)
    health = check_feed_health(health, feed_results)
    save_feed_health(health_path, health)

    history = load_history(cfg["history_path"])
    logger.info("Loaded history: %d entries", len(history))

    articles, skipped = filter_unseen(articles, history, days=cfg["dedup_window_days"], today=today)
    prefilt_count = len(articles)
    logger.info("Skipped %d already-pushed articles; %d remaining", len(skipped), prefilt_count)

    if not articles:
        logger.info("No new articles after history dedup. Exiting.")
        sys.exit(0)

    t_score = time.monotonic()
    kept, rejected, usage, timings = process_articles(articles, api_key, cfg)
    t_score = time.monotonic() - t_score

    dedup_count = len(kept) + len([r for r in rejected if r.get("score", 0) >= 5])

    if not kept:
        logger.info("No articles passed the quality filter today.")

    t_write = time.monotonic()
    path = write_output(kept, output_dir=cfg["output_dir"])
    json_path = write_digest_json(kept, output_dir=cfg["output_dir"], date=today)
    t_write = time.monotonic() - t_write

    logger.info("Done. Output written to: %s", path)
    logger.info("Web digest JSON: %s", json_path)
    logger.info("Final digest: %d articles | Rejected: %d articles", len(kept), len(rejected))

    history = record_pushed(history, kept, today=today)
    history = prune_history(history, days=cfg["dedup_window_days"], today=today)
    save_history(cfg["history_path"], history)
    logger.info("History updated: %d entries retained", len(history))

    t_total = time.monotonic() - t_start

    # --- Run summary ---
    by_topic: dict[str, int] = {}
    for a in kept:
        t = a.get("topic", "未分类")
        by_topic[t] = by_topic.get(t, 0) + 1

    cost = usage["input"] / 1_000_000 * cfg["price_in_per_m"] + usage["output"] / 1_000_000 * cfg["price_out_per_m"]

    logger.info("=== 运行摘要 ===")
    logger.info("抓取：%d 篇 → 预筛选：%d 篇 → 去重后：%d 篇 → 入选：%d 篇",
                fetched_count, prefilt_count, dedup_count, len(kept))
    if by_topic:
        logger.info("按主题分布：")
        for topic, count in by_topic.items():
            logger.info("  %s: %d 篇", topic, count)
    in_k = usage["input"] / 1000
    out_k = usage["output"] / 1000
    logger.info("Token: %.0fK in / %.1fK out | 成本: $%.3f", in_k, out_k, cost)
    logger.info("耗时: 总计 %.0fs（抓取 %.0fs + 评分 %.0fs + 去重 %.0fs + 摘要 %.0fs）",
                t_total, t_fetch, timings.get("score", 0), timings.get("dedup", 0), timings.get("summarize", 0))


if __name__ == "__main__":
    main()
