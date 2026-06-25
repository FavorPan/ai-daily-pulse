import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import { getDB, getAllIdeasWithVotes } from "./db";
import { optionalAuth } from "./middleware";

interface Bindings {
  DB: D1Database;
  SYNC_API_KEY: string;
}

const ideasRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/ideas — all ideas with vote counts
ideasRoutes.get("/ideas", optionalAuth, async (c) => {
  const db = getDB(c);
  const userId = c.var.user?.sub;
  const ideas = await getAllIdeasWithVotes(db, userId);

  const result = ideas.map((idea) => ({
    id: idea.id,
    date: idea.date,
    name: idea.name,
    name_zh: idea.name,
    name_en: idea.name_en,
    description: idea.description,
    description_zh: idea.description,
    description_en: idea.description_en,
    target_user: idea.target_user,
    target_user_zh: idea.target_user,
    target_user_en: idea.target_user_en,
    core_features: idea.core_features ? JSON.parse(idea.core_features) : [],
    core_features_zh: idea.core_features ? JSON.parse(idea.core_features) : [],
    core_features_en: idea.core_features_en ? JSON.parse(idea.core_features_en) : null,
    related_trends: idea.related_trends ? JSON.parse(idea.related_trends) : [],
    related_trends_zh: idea.related_trends ? JSON.parse(idea.related_trends) : [],
    related_trends_en: idea.related_trends_en ? JSON.parse(idea.related_trends_en) : null,
    why_now: idea.why_now,
    why_now_zh: idea.why_now,
    why_now_en: idea.why_now_en,
    monetization: idea.monetization,
    monetization_zh: idea.monetization,
    monetization_en: idea.monetization_en,
    difficulty: idea.difficulty,
    estimated_mvp_days: idea.estimated_mvp_days,
    source_article: idea.source_article,
    source_article_url: idea.source_article_url,
    source_article_score: idea.source_article_score,
    source_article_source: idea.source_article_source,
    social_pulse: idea.social_pulse_json ? JSON.parse(idea.social_pulse_json) : null,
    votes: {
      good: idea.votes_good,
      maybe: idea.votes_maybe,
      dont: idea.votes_dont,
      total: idea.votes_total,
    },
    my_vote: idea.my_vote ?? null,
  }));

  return c.json({ ideas: result });
});

// POST /api/ideas/sync — sync ideas from CI (requires Bearer token)
ideasRoutes.post("/ideas/sync", async (c) => {
  const auth = c.req.header("Authorization") ?? "";
  if (auth !== `Bearer ${c.env.SYNC_API_KEY}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json<{
    id: string;
    date: string;
    name: string;
    name_en?: string;
    description?: string;
    description_en?: string;
    target_user?: string;
    target_user_en?: string;
    core_features?: string[];
    core_features_en?: string[];
    related_trends?: string[];
    related_trends_en?: string[];
    why_now?: string;
    why_now_en?: string;
    monetization?: string;
    monetization_en?: string;
    difficulty?: string;
    estimated_mvp_days?: number;
    source_article?: string;
    source_article_url?: string;
    source_article_score?: number;
    source_article_source?: string;
    social_pulse?: unknown;
  }>();

  const db = getDB(c);
  const now = Math.floor(Date.now() / 1000);

  await db.prepare(
    `INSERT INTO ideas (id, date, name, name_en, description, description_en, target_user, target_user_en, core_features, core_features_en, related_trends, related_trends_en, why_now, why_now_en, monetization, monetization_en, difficulty, estimated_mvp_days, source_article, source_article_url, source_article_score, source_article_source, social_pulse_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       name_en = excluded.name_en,
       description = excluded.description,
       description_en = excluded.description_en,
       target_user = excluded.target_user,
       target_user_en = excluded.target_user_en,
       core_features = excluded.core_features,
       core_features_en = excluded.core_features_en,
       related_trends = excluded.related_trends,
       related_trends_en = excluded.related_trends_en,
       why_now = excluded.why_now,
       why_now_en = excluded.why_now_en,
       monetization = excluded.monetization,
       monetization_en = excluded.monetization_en,
       difficulty = excluded.difficulty,
       estimated_mvp_days = excluded.estimated_mvp_days,
       source_article = excluded.source_article,
       source_article_url = excluded.source_article_url,
       source_article_score = excluded.source_article_score,
       source_article_source = excluded.source_article_source,
       social_pulse_json = excluded.social_pulse_json`
  )
    .bind(
      body.id, body.date, body.name,
      body.name_en ?? null,
      body.description ?? null,
      body.description_en ?? null,
      body.target_user ?? null,
      body.target_user_en ?? null,
      body.core_features ? JSON.stringify(body.core_features) : null,
      body.core_features_en ? JSON.stringify(body.core_features_en) : null,
      body.related_trends ? JSON.stringify(body.related_trends) : null,
      body.related_trends_en ? JSON.stringify(body.related_trends_en) : null,
      body.why_now ?? null,
      body.why_now_en ?? null,
      body.monetization ?? null,
      body.monetization_en ?? null,
      body.difficulty ?? null,
      body.estimated_mvp_days ?? null,
      body.source_article ?? null,
      body.source_article_url ?? null,
      body.source_article_score ?? null,
      body.source_article_source ?? null,
      body.social_pulse ? JSON.stringify(body.social_pulse) : null,
      now
    )
    .run();

  return c.json({ ok: true });
});

export { ideasRoutes };
