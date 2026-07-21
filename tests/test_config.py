import os
from pathlib import Path

from src.config import load_config, DEFAULTS


def test_load_config_returns_defaults_when_no_file(tmp_path):
    missing = tmp_path / "config.toml"
    cfg = load_config(str(missing))
    for key, default in DEFAULTS.items():
        assert cfg[key] == default


def test_load_config_overrides_defaults_from_toml(tmp_path):
    path = tmp_path / "config.toml"
    path.write_text(
        '[api]\napi_key = "test-key"\nscoring_model = "gpt-4"\n\n'
        '[pipeline]\nlookback_days = 3\ncontent_cap = 2000\n',
        encoding="utf-8",
    )
    cfg = load_config(str(path))
    assert cfg["api_key"] == "test-key"
    assert cfg["scoring_model"] == "gpt-4"
    assert cfg["lookback_days"] == 3
    assert cfg["content_cap"] == 2000
    # Unset keys should retain defaults
    assert cfg["base_url"] == DEFAULTS["base_url"]


def test_env_vars_override_toml(tmp_path, monkeypatch):
    path = tmp_path / "config.toml"
    path.write_text('[api]\napi_key = "file-key"\n', encoding="utf-8")
    monkeypatch.setenv("API_KEY", "env-key")
    cfg = load_config(str(path))
    assert cfg["api_key"] == "env-key"


def test_numeric_types_are_correct(tmp_path):
    path = tmp_path / "config.toml"
    path.write_text(
        '[api]\nprice_in_per_m = 0.5\nprice_out_per_m = 1.0\n\n'
        '[pipeline]\nlookback_days = 7\nfetch_workers = 16\n',
        encoding="utf-8",
    )
    cfg = load_config(str(path))
    assert isinstance(cfg["lookback_days"], int)
    assert isinstance(cfg["fetch_workers"], int)
    assert isinstance(cfg["price_in_per_m"], float)
    assert isinstance(cfg["price_out_per_m"], float)


def test_invalid_numeric_env_does_not_crash(monkeypatch):
    monkeypatch.setenv("LOOKBACK_DAYS", "not-a-number")
    try:
        load_config("/nonexistent/path/config.toml")
        assert False, "Expected ValueError"
    except ValueError:
        pass


def test_env_numeric_override(tmp_path, monkeypatch):
    path = tmp_path / "config.toml"
    path.write_text("", encoding="utf-8")
    monkeypatch.setenv("LOOKBACK_DAYS", "5")
    monkeypatch.setenv("CONTENT_CAP", "8000")
    cfg = load_config(str(path))
    assert cfg["lookback_days"] == 5
    assert isinstance(cfg["lookback_days"], int)
    assert cfg["content_cap"] == 8000
    assert isinstance(cfg["content_cap"], int)


def test_timeouts_section_parsed_with_prefix(tmp_path):
    path = tmp_path / "config.toml"
    path.write_text(
        "[timeouts]\nfetch = 30\nextract = 25\nllm = 90\n",
        encoding="utf-8",
    )
    cfg = load_config(str(path))
    assert cfg["timeouts_fetch"] == 30
    assert cfg["timeouts_extract"] == 25
    assert cfg["timeouts_llm"] == 90
    # fetch_timeout mirrors timeouts_fetch for back-compat.
    assert cfg["fetch_timeout"] == 30


def test_timeouts_env_override(tmp_path, monkeypatch):
    path = tmp_path / "config.toml"
    path.write_text("", encoding="utf-8")
    monkeypatch.setenv("TIMEOUTS_LLM", "120")
    cfg = load_config(str(path))
    assert cfg["timeouts_llm"] == 120
    assert isinstance(cfg["timeouts_llm"], int)
