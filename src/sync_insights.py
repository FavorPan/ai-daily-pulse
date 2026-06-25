"""Sync build directions to the Insight Worker API."""

import hashlib
import os
import requests
from typing import Any


def _idea_id(source_url: str) -> str:
    """Generate a 12-char hex ID from the source article URL."""
    return hashlib.sha256(source_url.encode()).hexdigest()[:12]


def sync_insights(
    directions: list[dict[str, Any]],
    date: str,
    api_url: str | None = None,
    api_key: str | None = None,
) -> int:
    """Sync build directions to the Worker API. Returns count of synced ideas."""
    api_url = api_url or os.environ.get("INSIGHT_API_URL", "")
    api_key = api_key or os.environ.get("INSIGHT_SYNC_KEY", "")

    if not api_url or not api_key:
        print("[sync_insights] INSIGHT_API_URL or INSIGHT_SYNC_KEY not set, skipping sync")
        return 0

    synced = 0
    for idea in directions:
        source_url = idea.get("source_article_url", "")
        if not source_url:
            continue

        payload = {
            "id": _idea_id(source_url),
            "date": date,
            "name": idea.get("name", ""),
            "description": idea.get("description"),
            "target_user": idea.get("target_user"),
            "core_features": idea.get("core_features", []),
            "related_trends": idea.get("related_trends", []),
            "why_now": idea.get("why_now"),
            "monetization": idea.get("monetization"),
            "difficulty": idea.get("difficulty"),
            "estimated_mvp_days": idea.get("estimated_mvp_days"),
            "source_article": idea.get("source_article"),
            "source_article_url": source_url,
            "source_article_score": idea.get("source_article_score"),
            "source_article_source": idea.get("source_article_source"),
            "social_pulse": idea.get("social_pulse"),
        }

        try:
            resp = requests.post(
                f"{api_url}/api/ideas/sync",
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30,
            )
            if resp.ok:
                synced += 1
            else:
                print(f"[sync_insights] Failed to sync idea '{payload['name']}': {resp.status_code} {resp.text}")
        except requests.RequestException as e:
            print(f"[sync_insights] Request failed for '{payload['name']}': {e}")

    print(f"[sync_insights] Synced {synced}/{len(directions)} ideas to {api_url}")
    return synced
