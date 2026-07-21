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


# --- apply_quotas (balanced digest) ---

from src.writer import apply_quotas


def _art(title, score, topic):
    return {"title": title, "url": f"https://{title}.com", "score": score, "topic": topic}


def test_apply_quotas_caps_per_topic():
    articles = [_art(f"A{i}", 10 - i, "OPC/AI赚钱案例") for i in range(10)]
    out = apply_quotas(articles, {"digest_max_per_topic": 3, "digest_min_per_topic": 1, "digest_max_total": 0})
    assert len(out) == 3
    # Highest-scoring kept.
    assert out[0]["score"] == 10


def test_apply_quotas_preserves_min_per_topic():
    a = [_art(f"A{i}", 10 - i, "OPC/AI赚钱案例") for i in range(2)]
    b = [_art(f"B{i}", 5 - i, "AI新技术/新模型") for i in range(5)]
    out = apply_quotas(a + b, {"digest_max_per_topic": 3, "digest_min_per_topic": 2, "digest_max_total": 0})
    by_topic = {}
    for x in out:
        by_topic.setdefault(x["topic"], []).append(x)
    # OPC had only 2 -> both kept (below max, meets min).
    assert len(by_topic["OPC/AI赚钱案例"]) == 2
    # 新技术 capped at 3.
    assert len(by_topic["AI新技术/新模型"]) == 3


def test_apply_quotas_total_cap_truncates_by_score():
    articles = [_art(f"A{i}", 10 - i, f"topic{i}") for i in range(10)]
    out = apply_quotas(articles, {"digest_max_per_topic": 5, "digest_min_per_topic": 0, "digest_max_total": 4})
    assert len(out) == 4
    # Highest-scoring 4 globally.
    assert [x["score"] for x in out] == [10, 9, 8, 7]


def test_apply_quotas_no_cfg_returns_all():
    articles = [_art(f"A{i}", i, "t") for i in range(5)]
    assert apply_quotas(articles) == articles


def test_apply_quotas_empty():
    assert apply_quotas([]) == []
