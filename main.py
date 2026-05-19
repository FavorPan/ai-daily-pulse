#!/usr/bin/env python3
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from src.config import load_config
from src.feeds import fetch_all
from src.history import (
    filter_unseen,
    load_history,
    prune_history,
    record_pushed,
    save_history,
)
from src.scorer import process_articles
from src.writer import write_output


def main():
    cfg = load_config()

    api_key = cfg["api_key"]
    if not api_key:
        print("Error: API key not set. Set API_KEY env var or api.api_key in config.toml.")
        sys.exit(1)

    lookback_days = cfg["lookback_days"]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    print(f"=== AI Info Aggregator ===")
    print(f"Model: {cfg['scoring_model']} | Base URL: {cfg['base_url']}")
    print(f"Lookback: {lookback_days} day(s) | Dedup window: {cfg['dedup_window_days']} day(s)\n")

    print("[Fetching RSS feeds...]")
    articles = fetch_all(
        "feeds.toml",
        lookback_days=lookback_days,
        timeout=cfg["fetch_timeout"],
        content_cap=cfg["content_cap"],
        workers=cfg["fetch_workers"],
    )
    print(f"Total fetched: {len(articles)} articles")

    history = load_history(cfg["history_path"])
    print(f"Loaded history: {len(history)} entries")

    articles, skipped = filter_unseen(articles, history, days=cfg["dedup_window_days"], today=today)
    print(f"Skipped {len(skipped)} already-pushed articles; {len(articles)} remaining\n")

    if not articles:
        print("No new articles after history dedup. Exiting.")
        sys.exit(0)

    kept, rejected = process_articles(articles, api_key, cfg)

    if not kept:
        print("\nNo articles passed the quality filter today.")

    path = write_output(kept, output_dir=cfg["output_dir"])
    print(f"\nDone. Output written to: {path}")
    print(f"Final digest: {len(kept)} articles | Rejected: {len(rejected)} articles")


    history = record_pushed(history, kept, today=today)
    history = prune_history(history, days=cfg["dedup_window_days"], today=today)
    save_history(cfg["history_path"], history)
    print(f"History updated: {len(history)} entries retained")


if __name__ == "__main__":
    main()
