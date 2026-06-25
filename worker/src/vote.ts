import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import { getDB, upsertVote, deleteVote } from "./db";
import { authMiddleware } from "./middleware";

interface Bindings {
  DB: D1Database;
  JWT_SECRET: string;
}

const voteRoutes = new Hono<{ Bindings: Bindings }>();

// POST /api/vote — cast or change a vote
voteRoutes.post("/vote", authMiddleware, async (c) => {
  const user = c.var.user!;
  const { idea_id, vote_type } = await c.req.json<{
    idea_id: string;
    vote_type: "good" | "maybe" | "dont";
  }>();

  if (!idea_id) return c.json({ error: "Missing idea_id" }, 400);
  if (!["good", "maybe", "dont"].includes(vote_type)) {
    return c.json({ error: "Invalid vote_type" }, 400);
  }

  const db = getDB(c);
  const counts = await upsertVote(db, user.sub, idea_id, vote_type);

  return c.json({ ok: true, votes: counts });
});

// DELETE /api/vote/:ideaId — remove a vote
voteRoutes.delete("/vote/:ideaId", authMiddleware, async (c) => {
  const user = c.var.user!;
  const ideaId = c.req.param("ideaId");
  if (!ideaId) return c.json({ error: "Missing ideaId" }, 400);

  const db = getDB(c);
  const deleted = await deleteVote(db, user.sub, ideaId);

  if (!deleted) return c.json({ error: "Vote not found" }, 404);

  return c.json({ ok: true });
});

// GET /api/my-votes — get current user's votes
voteRoutes.get("/my-votes", authMiddleware, async (c) => {
  const user = c.var.user!;
  const db = getDB(c);

  const votes = await db
    .prepare("SELECT idea_id, vote_type FROM votes WHERE user_id = ?")
    .bind(user.sub)
    .all<{ idea_id: string; vote_type: string }>();

  return c.json({ votes: votes.results });
});

export { voteRoutes };
