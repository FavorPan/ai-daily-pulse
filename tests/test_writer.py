import os
from pathlib import Path

from src.writer import (
    build_digest_json,
    url_to_id,
    write_digest_json,
)


# --- digest JSON tests ---

def test_url_to_id_is_stable():
    assert url_to_id("https://example.com/a") == url_to_id("https://example.com/a")
    assert len(url_to_id("https://example.com/a")) == 12


def test_build_digest_json_fields_and_sort():
    articles = [
        {"title": "Low", "url": "https://a.com", "source": "S1", "score": 5,
         "topic": "AI新技术/新模型", "tags": ["t1"], "summary": "low sum"},
        {"title": "High", "url": "https://b.com", "source": "S2", "score": 9,
         "topic": "OPC/AI赚钱案例", "tags": [], "summary": "high sum",
         "why_now": "Chinese why now", "why_now_en": "English why now"},
    ]
    data = build_digest_json(articles, "2026-05-19")
    assert data["date"] == "2026-05-19"
    assert data["items"][0]["title"] == "High"
    assert data["items"][0]["id"] == url_to_id("https://b.com")
    assert data["items"][0]["score"] == 9
    assert data["items"][0]["why_now"] == "Chinese why now"
    assert data["items"][0]["why_now_en"] == "English why now"
    assert len(data["highlights"]) <= 3


def test_build_digest_json_highlights_fallback_to_titles():
    articles = [
        {"title": "Only", "url": "https://a.com", "source": "S", "score": 6,
         "topic": "AI新技术/新模型", "tags": []},
    ]
    data = build_digest_json(articles, "2026-05-19")
    assert data["highlights"] == ["Only"]


def test_build_digest_json_missing_why_now_en_is_empty_string():
    articles = [
        {"title": "T", "url": "https://a.com", "source": "S", "score": 7,
         "topic": "AI新技术/新模型", "tags": [], "summary": "s",
         "why_now": "cn"},
    ]
    data = build_digest_json(articles, "2026-05-19")
    assert data["items"][0]["why_now"] == "cn"
    assert data["items"][0]["why_now_en"] == ""


def test_write_digest_json_creates_dated_and_latest(tmp_path):
    articles = [
        {"title": "T", "url": "https://a.com", "source": "S", "score": 7,
         "topic": "AI新技术/新模型", "tags": [], "summary": "s"},
    ]
    path = write_digest_json(articles, output_dir=str(tmp_path), date="2026-05-19")
    assert path.endswith("digest-2026-05-19.json")
    assert (tmp_path / "latest.json").exists()
