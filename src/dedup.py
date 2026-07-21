"""URL normalization for cross-source / cross-run deduplication.

Ported from Horizon's _deduplication_url_key (orchestrator.py). Raw-URL
comparison lets the same article slip through when one source appends
a utm_source param and another does not. Normalizing before comparison
closes that gap while keeping the original URL in storage for readability.
"""

from urllib.parse import unquote_plus, urlsplit

# Tracking / analytics query params that do not change article identity.
TRACKING_PARAMS = {
    "_ga",
    "dclid",
    "fbclid",
    "gclid",
    "igshid",
    "li_fat_id",
    "mc_cid",
    "mc_eid",
    "msclkid",
    "ttclid",
    "twclid",
    "vero_id",
}


def url_key(url: str) -> tuple:
    """Return a conservative identity key for url.

    Two URLs that differ only in tracking params, default ports, scheme case,
    or a trailing slash map to the same key.
    """
    if not url:
        return ()
    parsed = urlsplit(url)
    scheme = parsed.scheme.lower()
    host = (parsed.hostname or "").lower()
    port = parsed.port
    if (scheme, port) in {("http", 80), ("https", 443)}:
        port = None

    path = parsed.path.rstrip("/") or "/"

    query_parts = []
    for part in parsed.query.split("&") if parsed.query else []:
        name = unquote_plus(part.partition("=")[0]).lower()
        if name.startswith("utm_") or name in TRACKING_PARAMS:
            continue
        query_parts.append(part)

    return (
        scheme,
        parsed.username or "",
        parsed.password or "",
        host,
        port,
        path,
        "&".join(query_parts),
    )


def urls_match(a: str, b: str) -> bool:
    """True if two URLs refer to the same article under normalization."""
    return url_key(a) == url_key(b)
