import json
from pathlib import Path

from src.feed_health import load_feed_health, save_feed_health, check_feed_health


def test_load_feed_health_returns_empty_when_missing(tmp_path):
    assert load_feed_health(str(tmp_path / "nope.json")) == {}


def test_load_feed_health_returns_data_when_exists(tmp_path):
    path = tmp_path / "health.json"
    data = {"feed1": {"name": "feed1", "consecutive_failures": 0}}
    path.write_text(json.dumps(data), encoding="utf-8")
    assert load_feed_health(str(path)) == data


def test_load_feed_health_returns_empty_on_malformed(tmp_path):
    path = tmp_path / "health.json"
    path.write_text("not json", encoding="utf-8")
    assert load_feed_health(str(path)) == {}


def test_save_feed_health_creates_parent_dirs(tmp_path):
    path = tmp_path / "sub" / "health.json"
    save_feed_health(str(path), {"f": {"name": "f"}})
    assert path.exists()
    data = json.loads(path.read_text(encoding="utf-8"))
    assert data["f"]["name"] == "f"


def test_save_feed_health_roundtrips(tmp_path):
    path = tmp_path / "health.json"
    data = {"f1": {"name": "f1", "consecutive_failures": 2, "total_articles": 10}}
    save_feed_health(str(path), data)
    assert load_feed_health(str(path)) == data


def test_check_feed_health_records_success():
    health = {}
    results = [{"name": "feed-a", "success": True, "count": 5}]
    updated = check_feed_health(health, results)
    assert updated["feed-a"]["consecutive_failures"] == 0
    assert updated["feed-a"]["total_articles"] == 5
    assert updated["feed-a"]["last_success"] is not None


def test_check_feed_health_records_failure():
    health = {}
    results = [{"name": "feed-b", "success": False, "count": 0, "error": "timeout"}]
    updated = check_feed_health(health, results)
    assert updated["feed-b"]["consecutive_failures"] == 1
    assert updated["feed-b"]["last_failure"] is not None


def test_check_feed_health_resets_consecutive_on_success():
    health = {"f": {"name": "f", "consecutive_failures": 5, "total_articles": 0}}
    results = [{"name": "f", "success": True, "count": 3}]
    updated = check_feed_health(health, results)
    assert updated["f"]["consecutive_failures"] == 0
    assert updated["f"]["total_articles"] == 3


def test_check_feed_health_increments_consecutive_failures():
    health = {"f": {"name": "f", "consecutive_failures": 2, "total_articles": 10}}
    results = [{"name": "f", "success": False, "count": 0}]
    updated = check_feed_health(health, results)
    assert updated["f"]["consecutive_failures"] == 3


def test_check_feed_health_warns_on_three_consecutive_failures(caplog):
    import logging
    with caplog.at_level(logging.WARNING):
        health = {"f": {"name": "f", "consecutive_failures": 2, "total_articles": 0}}
        results = [{"name": "f", "success": False, "count": 0}]
        check_feed_health(health, results)
    assert "3 consecutive" in caplog.text
