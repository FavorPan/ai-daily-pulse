import json
import logging
import os
from datetime import datetime, timezone

from src.file_utils import atomic_write_text

logger = logging.getLogger(__name__)


def load_feed_health(path: str) -> dict[str, dict]:
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save_feed_health(path: str, health: dict[str, dict]) -> None:
    text = json.dumps(health, ensure_ascii=False, indent=2)
    atomic_write_text(path, text)


def check_feed_health(health: dict[str, dict], feed_results: list[dict]) -> dict[str, dict]:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    for result in feed_results:
        name = result["name"]
        entry = health.get(name, {
            "name": name,
            "last_success": None,
            "last_failure": None,
            "consecutive_failures": 0,
            "total_articles": 0,
        })

        if result["success"]:
            entry["last_success"] = now
            entry["consecutive_failures"] = 0
            entry["total_articles"] = entry.get("total_articles", 0) + result["count"]
        else:
            entry["last_failure"] = now
            entry["consecutive_failures"] = entry.get("consecutive_failures", 0) + 1

        health[name] = entry

    # Warn about feeds with >= 3 consecutive failures
    for name, entry in health.items():
        if entry.get("consecutive_failures", 0) >= 3:
            logger.warning("Feed '%s' has failed %d consecutive times (last: %s)",
                           name, entry["consecutive_failures"], entry.get("last_failure"))

    return health
