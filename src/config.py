import os
import sys

if sys.version_info >= (3, 11):
    import tomllib
else:
    import tomli as tomllib

DEFAULTS = {
    "api_key": "",
    "base_url": "https://api.deepseek.com",
    "scoring_model": "deepseek-v4-flash",
    "summary_model": "deepseek-v4-flash",
    "price_in_per_m": 0.14,
    "price_out_per_m": 0.28,
    "fallback_base_url": "",
    "fallback_api_key": "",
    "fallback_model": "",
    "max_concurrency": 0,
    "lookback_days": 1,
    "dedup_window_days": 90,
    "content_cap": 4000,
    "output_dir": "output",
    "history_path": "data/pushed.json",
    "feed_health_path": "data/feed_health.json",
    "fetch_timeout": 15,
    "fetch_workers": 8,
    "score_workers": 4,
    "log_level": "INFO",
    "last30days_enabled": False,
    "last30days_engine_path": "~/.hermes/skills/last30days/scripts/last30days.py",
    "last30days_python_path": "python3.12",
    "last30days_timeout": 30,
    "last30days_search_sources": "reddit,hackernews",
    "insight_sync_enabled": False,
    "timeouts_fetch": 15,
    "timeouts_extract": 20,
    "timeouts_llm": 60,
    "digest_max_per_topic": 8,
    "digest_min_per_topic": 1,
    "digest_max_total": 60,
}

NUMERIC_INT_KEYS = {
    "lookback_days", "dedup_window_days", "content_cap",
    "fetch_timeout", "fetch_workers", "score_workers",
    "timeouts_fetch", "timeouts_extract", "timeouts_llm",
    "max_concurrency",
    "digest_max_per_topic", "digest_min_per_topic", "digest_max_total",
}
NUMERIC_FLOAT_KEYS = {"price_in_per_m", "price_out_per_m"}

ENV_MAP = {
    "API_KEY": "api_key",
    "BASE_URL": "base_url",
    "SCORING_MODEL": "scoring_model",
    "SUMMARY_MODEL": "summary_model",
    "FALLBACK_BASE_URL": "fallback_base_url",
    "FALLBACK_API_KEY": "fallback_api_key",
    "FALLBACK_MODEL": "fallback_model",
    "LLM_MAX_CONCURRENCY": "max_concurrency",
    "DIGEST_MAX_PER_TOPIC": "digest_max_per_topic",
    "DIGEST_MIN_PER_TOPIC": "digest_min_per_topic",
    "DIGEST_MAX_TOTAL": "digest_max_total",
    "LOOKBACK_DAYS": "lookback_days",
    "DEDUP_WINDOW_DAYS": "dedup_window_days",
    "CONTENT_CAP": "content_cap",
    "OUTPUT_DIR": "output_dir",
    "HISTORY_PATH": "history_path",
    "FEED_HEALTH_PATH": "feed_health_path",
    "LOG_LEVEL": "log_level",
    "TODAY": "today",
    "TIMEOUTS_FETCH": "timeouts_fetch",
    "TIMEOUTS_EXTRACT": "timeouts_extract",
    "TIMEOUTS_LLM": "timeouts_llm",
}


def load_config(path: str = "config.toml") -> dict:
    cfg = dict(DEFAULTS)

    if os.path.exists(path):
        with open(path, "rb") as f:
            data = tomllib.load(f)
        for section in ("api", "pipeline", "last30days", "insight", "timeouts", "digest"):
            if section in data:
                for k, v in data[section].items():
                    if section in ("last30days", "insight", "timeouts", "digest"):
                        cfg[f"{section}_{k}"] = v
                    elif k in cfg:
                        cfg[k] = v

    # Back-compat: fetch_timeout mirrors timeouts_fetch for callers that still read it.
    cfg["fetch_timeout"] = cfg.get("timeouts_fetch", 15)

    for env_var, cfg_key in ENV_MAP.items():
        val = os.environ.get(env_var)
        if val is not None:
            if cfg_key in NUMERIC_INT_KEYS:
                cfg[cfg_key] = int(val)
            elif cfg_key in NUMERIC_FLOAT_KEYS:
                cfg[cfg_key] = float(val)
            else:
                cfg[cfg_key] = val

    return cfg
