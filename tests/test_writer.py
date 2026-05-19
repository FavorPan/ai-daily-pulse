import os
from pathlib import Path

from src.writer import generate_markdown, write_output, TOPIC_ORDER


# --- generate_markdown tests ---

def test_generate_markdown_groups_by_topic():
    articles = [
        {"title": "A1", "url": "https://a.com", "source": "S1", "score": 8,
         "topic": "AI新技术/新模型", "tags": ["llm"]},
        {"title": "A2", "url": "https://b.com", "source": "S2", "score": 7,
         "topic": "OPC/AI赚钱案例", "tags": []},
    ]
    md = generate_markdown(articles, "2026-04-21")
    idx_new = md.index("## AI新技术/新模型")
    idx_opc = md.index("## OPC/AI赚钱案例")
    # OPC/AI赚钱案例 comes before AI新技术/新模型 in TOPIC_ORDER
    assert idx_opc < idx_new


def test_generate_markdown_sorts_by_score_desc():
    articles = [
        {"title": "Low", "url": "https://a.com", "source": "S", "score": 5,
         "topic": "AI新技术/新模型", "tags": []},
        {"title": "High", "url": "https://b.com", "source": "S", "score": 9,
         "topic": "AI新技术/新模型", "tags": []},
    ]
    md = generate_markdown(articles, "2026-04-21")
    idx_high = md.index("### [High]")
    idx_low = md.index("### [Low]")
    assert idx_high < idx_low


def test_generate_markdown_empty_shows_placeholder():
    md = generate_markdown([], "2026-04-21")
    assert "今日暂无符合标准的内容" in md


def test_generate_markdown_includes_frontmatter():
    articles = [
        {"title": "T", "url": "https://a.com", "source": "S", "score": 6,
         "topic": "AI新技术/新模型", "tags": ["x"]},
    ]
    md = generate_markdown(articles, "2026-04-21")
    assert md.startswith("---")
    assert "date: 2026-04-21" in md
    assert "tags: [ai-daily]" in md


# --- write_output tests ---

def test_write_output_creates_file_and_returns_path(tmp_path):
    articles = [
        {"title": "Test", "url": "https://a.com", "source": "S", "score": 7,
         "topic": "AI新技术/新模型", "tags": ["t1"]},
    ]
    path = write_output(articles, output_dir=str(tmp_path))
    assert os.path.exists(path)
    assert "AI Daily" in path
    with open(path, encoding="utf-8") as f:
        content = f.read()
    assert "Test" in content


def test_write_output_creates_directory(tmp_path):
    out = tmp_path / "sub" / "dir"
    articles = [
        {"title": "T", "url": "https://a.com", "source": "S", "score": 6,
         "topic": "AI新技术/新模型", "tags": []},
    ]
    path = write_output(articles, output_dir=str(out))
    assert os.path.exists(path)
