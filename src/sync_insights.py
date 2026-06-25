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
            "name_en": idea.get("name_en"),
            "description": idea.get("description"),
            "description_en": idea.get("description_en"),
            "target_user": idea.get("target_user"),
            "target_user_en": idea.get("target_user_en"),
            "core_features": idea.get("core_features", []),
            "core_features_en": idea.get("core_features_en"),
            "related_trends": idea.get("related_trends", []),
            "related_trends_en": idea.get("related_trends_en"),
            "why_now": idea.get("why_now"),
            "why_now_en": idea.get("why_now_en"),
            "monetization": idea.get("monetization"),
            "monetization_en": idea.get("monetization_en"),
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
