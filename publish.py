#!/usr/bin/env python3
"""
社媒文案生成 + 自动发帖。

独立于主管道运行，读取 latest.json，生成文案，直接发布。
不产出任何 output 文件。

用法：
  python publish.py              # 生成文案 + 发帖（需 xurl）
  python publish.py --dry-run    # 只生成文案，不发帖（预览）
  python publish.py --thread     # 发 X thread（3-5 条推文）
"""

import argparse
import json
import logging
import subprocess
import sys

from dotenv import load_dotenv
load_dotenv()

from src.config import load_config
from src.insights import generate_social_post, generate_x_thread
from openai import OpenAI

logger = logging.getLogger(__name__)


def _setup_logging():
    fmt = "[%(asctime)s] %(levelname)s %(message)s"
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(fmt, datefmt="%H:%M:%S"))
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)


def load_latest_digest(path: str = "output/latest.json") -> dict:
    """Load the latest digest JSON."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def post_to_x(text: str) -> bool:
    """Post text to X/Twitter via xurl. Returns True on success."""
    try:
        result = subprocess.run(
            ["xurl", "post", text],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode == 0:
            logger.info("✅ Posted to X successfully")
            return True
        else:
            logger.error("❌ X post failed: %s", result.stderr or result.stdout)
            return False
    except FileNotFoundError:
        logger.error("❌ xurl not installed. Run: brew install --cask xdevplatform/tap/xurl")
        return False
    except Exception as e:
        logger.error("❌ X post error: %s", e)
        return False


def post_thread(tweets: list[str]) -> bool:
    """Post a thread to X/Twitter. Each tweet replies to the previous one."""
    try:
        # Post first tweet
        result = subprocess.run(
            ["xurl", "post", tweets[0]],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            logger.error("❌ Thread first tweet failed: %s", result.stderr)
            return False

        # Extract post ID from response
        data = json.loads(result.stdout)
        post_id = data.get("data", {}).get("id", "")
        if not post_id:
            logger.error("❌ Could not extract post ID from response")
            return False

        logger.info("✅ Tweet 1/%d posted (id: %s)", len(tweets), post_id)

        # Post remaining tweets as replies
        for i, tweet in enumerate(tweets[1:], 2):
            result = subprocess.run(
                ["xurl", "reply", post_id, tweet],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                logger.error("❌ Tweet %d/%d failed: %s", i, len(tweets), result.stderr)
                return False

            data = json.loads(result.stdout)
            post_id = data.get("data", {}).get("id", post_id)
            logger.info("✅ Tweet %d/%d posted (id: %s)", i, len(tweets), post_id)

        logger.info("🎉 Thread posted successfully (%d tweets)", len(tweets))
        return True

    except FileNotFoundError:
        logger.error("❌ xurl not installed")
        return False
    except Exception as e:
        logger.error("❌ Thread post error: %s", e)
        return False


def main():
    _setup_logging()
    parser = argparse.ArgumentParser(description="Generate and publish social media posts")
    parser.add_argument("--dry-run", action="store_true", help="Only generate, don't post")
    parser.add_argument("--thread", action="store_true", help="Post as X thread instead of single tweet")
    parser.add_argument("--lang", choices=["zh", "en", "both"], default="both", help="Which language to post")
    parser.add_argument("--digest", default="output/latest.json", help="Path to digest JSON")
    args = parser.parse_args()

    cfg = load_config()
    api_key = cfg["api_key"]
    if not api_key:
        logger.error("API key not set")
        sys.exit(1)

    # Load digest
    try:
        digest = load_latest_digest(args.digest)
    except FileNotFoundError:
        logger.error("Digest file not found: %s", args.digest)
        logger.error("Run 'python main.py' first to generate today's digest")
        sys.exit(1)

    articles = digest.get("items", [])
    if not articles:
        logger.error("No articles in digest")
        sys.exit(1)

    client = OpenAI(api_key=api_key, base_url=cfg["base_url"])
    model = cfg["summary_model"]

    if args.thread:
        # Generate and post thread
        logger.info("Generating X thread...")
        tweets = generate_x_thread(articles, client, model)
        if not tweets:
            logger.error("Failed to generate thread")
            sys.exit(1)

        print("\n" + "=" * 50)
        print("X THREAD PREVIEW")
        print("=" * 50)
        for i, tweet in enumerate(tweets, 1):
            print(f"\n--- Tweet {i}/{len(tweets)} ---")
            print(tweet)
        print("\n" + "=" * 50)

        if args.dry_run:
            logger.info("Dry run — not posting")
            return

        confirm = input("\nPost this thread to X? [y/N] ")
        if confirm.lower() == "y":
            post_thread(tweets)
        else:
            logger.info("Cancelled")

    else:
        # Generate and post single tweet
        logger.info("Generating social post...")
        post = generate_social_post(articles, client, model)
        if not post.get("zh") and not post.get("en"):
            logger.error("Failed to generate post")
            sys.exit(1)

        print("\n" + "=" * 50)
        print("SOCIAL POST PREVIEW")
        print("=" * 50)
        if args.lang in ("zh", "both") and post.get("zh"):
            print(f"\n🇨🇳 中文版：\n{post['zh']}")
        if args.lang in ("en", "both") and post.get("en"):
            print(f"\n🇺🇸 English：\n{post['en']}")
        print("\n" + "=" * 50)

        if args.dry_run:
            logger.info("Dry run — not posting")
            return

        # Determine which to post
        text = ""
        if args.lang == "zh":
            text = post.get("zh", "")
        elif args.lang == "en":
            text = post.get("en", "")
        else:
            # Post both as separate tweets
            choice = input("\nPost which version? [z]h / [e]n / [b]oth / [n]one: ")
            if choice == "z":
                text = post.get("zh", "")
            elif choice == "e":
                text = post.get("en", "")
            elif choice == "b":
                if post.get("zh"):
                    post_to_x(post["zh"])
                if post.get("en"):
                    post_to_x(post["en"])
                return
            else:
                logger.info("Cancelled")
                return

        if text:
            confirm = input(f"\nPost to X?\n{text}\n\n[y/N] ")
            if confirm.lower() == "y":
                post_to_x(text)
            else:
                logger.info("Cancelled")


if __name__ == "__main__":
    main()
