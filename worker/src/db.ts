import type { D1Database } from "@cloudflare/workers-types";

export function getDB(c: { env: { DB: D1Database } }): D1Database {
  return c.env.DB;
}

let initialized = false;

export async function initDB(db: D1Database): Promise<void> {
  if (initialized) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      avatar_url TEXT,
      provider TEXT NOT NULL,
      provider_id TEXT,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      name_en TEXT,
      description TEXT,
      description_en TEXT,
      target_user TEXT,
      target_user_en TEXT,
      core_features TEXT,
      core_features_en TEXT,
      related_trends TEXT,
      related_trends_en TEXT,
      why_now TEXT,
      why_now_en TEXT,
      monetization TEXT,
      monetization_en TEXT,
      difficulty TEXT,
      estimated_mvp_days INTEGER,
      source_article TEXT,
      source_article_url TEXT,
      source_article_score REAL,
      source_article_source TEXT,
      social_pulse_json TEXT,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      idea_id TEXT NOT NULL REFERENCES ideas(id),
      vote_type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(user_id, idea_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS email_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER DEFAULT 0
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_votes_idea_id ON votes(idea_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_ideas_date ON ideas(date)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_codes_email ON email_codes(email)`),
  ]);
  initialized = true;
}

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  provider: "github" | "google" | "email";
  provider_id: string | null;
  created_at: number;
}

export interface IdeaRow {
  id: string;
  date: string;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
  target_user: string | null;
  target_user_en: string | null;
  core_features: string | null;
  core_features_en: string | null;
  related_trends: string | null;
  related_trends_en: string | null;
  why_now: string | null;
  why_now_en: string | null;
  monetization: string | null;
  monetization_en: string | null;
  difficulty: string | null;
  estimated_mvp_days: number | null;
  source_article: string | null;
  source_article_url: string | null;
  source_article_score: number | null;
  source_article_source: string | null;
  social_pulse_json: string | null;
  created_at: number;
}

export interface VoteRow {
  id: number;
  user_id: string;
  idea_id: string;
  vote_type: "good" | "maybe" | "dont";
  created_at: number;
  updated_at: number;
}

export interface IdeaWithVotes extends IdeaRow {
  votes_good: number;
  votes_maybe: number;
  votes_dont: number;
  votes_total: number;
  my_vote: string | null;
}

export async function getAllIdeasWithVotes(
  db: D1Database,
  userId?: string
): Promise<IdeaWithVotes[]> {
  const result = await db
    .prepare(
      `SELECT
        i.*,
        COALESCE(SUM(CASE WHEN v.vote_type = 'good' THEN 1 ELSE 0 END), 0) as votes_good,
        COALESCE(SUM(CASE WHEN v.vote_type = 'maybe' THEN 1 ELSE 0 END), 0) as votes_maybe,
        COALESCE(SUM(CASE WHEN v.vote_type = 'dont' THEN 1 ELSE 0 END), 0) as votes_dont,
        COALESCE(COUNT(v.id), 0) as votes_total
      FROM ideas i
      LEFT JOIN votes v ON v.idea_id = i.id
      GROUP BY i.id
      ORDER BY votes_good DESC, i.created_at DESC`
    )
    .all<IdeaWithVotes>();

  const ideas = result.results;

  if (userId && ideas.length > 0) {
    const placeholders = ideas.map(() => "?").join(",");
    const userVotes = await db
      .prepare(
        `SELECT idea_id, vote_type FROM votes WHERE user_id = ? AND idea_id IN (${placeholders})`
      )
      .bind(userId, ...ideas.map((i) => i.id))
      .all<{ idea_id: string; vote_type: string }>();

    const voteMap = new Map(userVotes.results.map((v) => [v.idea_id, v.vote_type]));
    for (const idea of ideas) {
      idea.my_vote = voteMap.get(idea.id) ?? null;
    }
  }

  return ideas;
}

export async function upsertVote(
  db: D1Database,
  userId: string,
  ideaId: string,
  voteType: "good" | "maybe" | "dont"
): Promise<{ good: number; maybe: number; dont: number; total: number }> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO votes (user_id, idea_id, vote_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, idea_id) DO UPDATE SET
         vote_type = excluded.vote_type,
         updated_at = excluded.updated_at`
    )
    .bind(userId, ideaId, voteType, now, now)
    .run();

  const counts = await db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN vote_type = 'good' THEN 1 ELSE 0 END), 0) as good,
        COALESCE(SUM(CASE WHEN vote_type = 'maybe' THEN 1 ELSE 0 END), 0) as maybe,
        COALESCE(SUM(CASE WHEN vote_type = 'dont' THEN 1 ELSE 0 END), 0) as dont,
        COUNT(*) as total
      FROM votes WHERE idea_id = ?`
    )
    .bind(ideaId)
    .first<{ good: number; maybe: number; dont: number; total: number }>();

  return counts ?? { good: 0, maybe: 0, dont: 0, total: 0 };
}

export async function deleteVote(
  db: D1Database,
  userId: string,
  ideaId: string
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM votes WHERE user_id = ? AND idea_id = ?")
    .bind(userId, ideaId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function findOrCreateUser(
  db: D1Database,
  params: {
    email: string;
    name?: string;
    avatar_url?: string;
    provider: "github" | "google" | "email";
    provider_id?: string;
  }
): Promise<UserRow> {
  const { email, name, avatar_url, provider, provider_id } = params;

  let user: UserRow | null = null;

  if (provider === "email") {
    user = await db.prepare("SELECT * FROM users WHERE email = ? AND provider = 'email'")
      .bind(email).first<UserRow>();
  } else if (provider_id) {
    user = await db.prepare("SELECT * FROM users WHERE provider = ? AND provider_id = ?")
      .bind(provider, provider_id).first<UserRow>();
  }

  if (user) {
    await db.prepare("UPDATE users SET name = ?, avatar_url = ? WHERE id = ?")
      .bind(name ?? user.name, avatar_url ?? user.avatar_url, user.id).run();
    return { ...user, name: name ?? user.name, avatar_url: avatar_url ?? user.avatar_url };
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    "INSERT INTO users (id, email, name, avatar_url, provider, provider_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, email, name ?? null, avatar_url ?? null, provider, provider_id ?? null, now).run();

  return { id, email, name: name ?? null, avatar_url: avatar_url ?? null, provider, provider_id: provider_id ?? null, created_at: now };
}
