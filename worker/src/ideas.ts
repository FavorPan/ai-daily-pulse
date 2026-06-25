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
    description: idea.description,
    target_user: idea.target_user,
    core_features: idea.core_features ? JSON.parse(idea.core_features) : [],
    related_trends: idea.related_trends ? JSON.parse(idea.related_trends) : [],
    why_now: idea.why_now,
    monetization: idea.monetization,
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
    description?: string;
    target_user?: string;
    core_features?: string[];
    related_trends?: string[];
    why_now?: string;
    monetization?: string;
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
    `INSERT INTO ideas (id, date, name, description, target_user, core_features, related_trends, why_now, monetization, difficulty, estimated_mvp_days, source_article, source_article_url, source_article_score, source_article_source, social_pulse_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       description = excluded.description,
       target_user = excluded.target_user,
       core_features = excluded.core_features,
       related_trends = excluded.related_trends,
       why_now = excluded.why_now,
       monetization = excluded.monetization,
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
      body.description ?? null,
      body.target_user ?? null,
      body.core_features ? JSON.stringify(body.core_features) : null,
      body.related_trends ? JSON.stringify(body.related_trends) : null,
      body.why_now ?? null,
      body.monetization ?? null,
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
