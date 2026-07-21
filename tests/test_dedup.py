"""Tests for URL normalization."""
from src.dedup import url_key, urls_match


def test_empty_url_returns_empty_tuple():
    assert url_key("") == ()


def test_strips_utm_params():
    a = "https://example.com/post?utm_source=twitter&utm_medium=social"
    b = "https://example.com/post"
    assert urls_match(a, b)


def test_strips_known_tracking_params():
    a = "https://example.com/post?fbclid=abc&gclid=def"
    b = "https://example.com/post"
    assert urls_match(a, b)


def test_preserves_meaningful_query():
    a = "https://example.com/post?id=42"
    b = "https://example.com/post?id=43"
    assert not urls_match(a, b)


def test_trailing_slash_ignored():
    assert urls_match("https://example.com/post/", "https://example.com/post")


def test_scheme_case_normalized():
    assert urls_match("HTTPS://Example.COM/Post", "https://example.com/Post")


def test_default_port_stripped():
    assert urls_match("https://example.com:443/post", "https://example.com/post")
    assert urls_match("http://example.com:80/post", "http://example.com/post")


def test_non_default_port_kept():
    assert not urls_match("https://example.com:8443/post", "https://example.com/post")


def test_different_hosts_differ():
    assert not urls_match("https://a.com/post", "https://b.com/post")


def test_utm_and_real_query_mix():
    a = "https://example.com/post?utm_source=x&id=7"
    b = "https://example.com/post?id=7"
    assert urls_match(a, b)
