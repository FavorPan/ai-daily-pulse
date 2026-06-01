from src.trends import detect_trends, _extract_keywords


def test_extract_keywords_english():
    kws = _extract_keywords("OpenAI releases GPT-5 with new API")
    assert "openai" in kws
    assert "releases" in kws
    assert "api" in kws


def test_extract_keywords_chinese():
    kws = _extract_keywords("人工智能大模型发布新版本")
    assert "人工智能" in kws or "人工智" in kws
    assert "大模型" in kws


def test_detect_trends_multi_source():
    articles = [
        {"title": "GPT-5 released", "summary": "OpenAI launches GPT-5", "source": "TechCrunch", "tags": ["GPT-5"]},
        {"title": "GPT-5 benchmark results", "summary": "GPT-5 beats all benchmarks", "source": "VentureBeat", "tags": ["GPT-5"]},
        {"title": "GPT-5 API pricing", "summary": "OpenAI GPT-5 API available", "source": "HN", "tags": ["GPT-5"]},
        {"title": "Random article", "summary": "Nothing related", "source": "Blog", "tags": []},
    ]
    result = detect_trends(articles, min_sources=3)
    gpt5_articles = [a for a in result if a["trend_signal"]]
    assert len(gpt5_articles) >= 3
    assert all(a["trend_source_count"] >= 3 for a in gpt5_articles)


def test_detect_trends_no_signal():
    articles = [
        {"title": "Topic A", "summary": "Something unique here", "source": "Source1", "tags": []},
        {"title": "Topic B", "summary": "Different content entirely", "source": "Source2", "tags": []},
    ]
    result = detect_trends(articles, min_sources=3)
    assert all(not a["trend_signal"] for a in result)


def test_detect_trends_empty():
    result = detect_trends([], min_sources=3)
    assert result == []


def test_detect_trends_sets_default_fields():
    articles = [
        {"title": "Solo article", "summary": "Alone", "source": "Src", "tags": []},
    ]
    result = detect_trends(articles, min_sources=3)
    assert result[0]["trend_signal"] is False
    assert result[0]["trend_topic"] == ""
    assert result[0]["trend_source_count"] == 0
