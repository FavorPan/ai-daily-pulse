# Insight Module Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Builder module into Insight — aggregate all build directions across dates, add three-tier voting (Good/Maybe/Don't), and GitHub/Google/Email authentication via a new Cloudflare Worker backend.

**Architecture:** New Cloudflare Worker (Hono + D1) serves as API backend at `api.ai-daily-pulse.top`. Next.js frontend stays static export on Cloudflare Pages, fetching ideas and votes from the Worker. Python pipeline syncs new ideas to D1 via a secured endpoint.

**Tech Stack:** Hono (Worker framework), Cloudflare D1 (SQLite), JWT (jose library), Resend (email), Next.js 16 + React 19 + Tailwind CSS 3 + next-intl (frontend, unchanged stack).

## Global Constraints

- Frontend stays `output: "export"` static export — no SSR changes
- Worker deploys independently via `wrangler deploy`
- All three auth methods (GitHub, Google, Email) must work
- One vote per user per idea, changeable (UPSERT)
- Default sort: Good votes descending
- Filters: difficulty (easy/medium/hard), date range
- Backward compatibility: `/builder` → `/insight` redirects
- Zero cost: all services within free tiers

---

## Part A: Cloudflare Worker Backend

### Task A1: Initialize Worker project

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/wrangler.toml`
- Create: `worker/src/index.ts`

**Interfaces:**
- Produces: Hono app exported as default, D1 binding `DB`, env bindings for secrets

- [ ] **Step 1: Create worker/package.json**

```json
{
  "name": "ai-daily-pulse-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "db:init": "wrangler d1 execute ai-daily-pulse --local --file=schema.sql",
    "db:init:remote": "wrangler d1 execute ai-daily-pulse --file=schema.sql"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "jose": "^5.9.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250624.0",
    "wrangler": "^3.107.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create worker/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create worker/wrangler.toml**

```toml
name = "ai-daily-pulse-api"
main = "src/index.ts"
compatibility_date = "2025-06-25"

[[d1_databases]]
binding = "DB"
database_name = "ai-daily-pulse"
database_id = ""

[vars]
FRONTEND_URL = "https://ai-daily-pulse.top"

[env.production]
routes = [
  { pattern = "api.ai-daily-pulse.top", custom_domain = true }
]
```

- [ ] **Step 4: Create worker/src/index.ts (skeleton)**

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["https://ai-daily-pulse.top", "http://localhost:3000"],
    credentials: true,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/api/health", (c) => c.json({ ok: true }));

export default app;
```

- [ ] **Step 5: Install dependencies and verify**

```bash
cd worker && npm install
```

- [ ] **Step 6: Commit**

```bash
git add worker/
git commit -m "feat(worker): initialize Hono worker project with wrangler config"
```

---

### Task A2: D1 schema and database helpers

**Files:**
- Create: `worker/schema.sql`
- Create: `worker/src/db.ts`

**Interfaces:**
- Produces: `getDB(c)` helper, typed DB operations

- [ ] **Step 1: Create worker/schema.sql**

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL,
  provider_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_user TEXT,
  core_features TEXT,
  related_trends TEXT,
  why_now TEXT,
  monetization TEXT,
  difficulty TEXT,
  estimated_mvp_days INTEGER,
  source_article TEXT,
  source_article_url TEXT,
  source_article_score REAL,
  source_article_source TEXT,
  social_pulse_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  idea_id TEXT NOT NULL REFERENCES ideas(id),
  vote_type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, idea_id)
);

CREATE TABLE IF NOT EXISTS email_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_votes_idea_id ON votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_date ON ideas(date);
CREATE INDEX IF NOT EXISTS idx_email_codes_email ON email_codes(email);
```

- [ ] **Step 2: Create worker/src/db.ts**

```typescript
import type { D1Database } from "@cloudflare/workers-types";

export function getDB(c: { env: { DB: D1Database } }): D1Database {
  return c.env.DB;
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
  description: string | null;
  target_user: string | null;
  core_features: string | null;
  related_trends: string | null;
  why_now: string | null;
  monetization: string | null;
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
    const userVotes = await db
      .prepare(
        `SELECT idea_id, vote_type FROM votes WHERE user_id = ? AND idea_id IN (${ideas.map(() => "?").join(",")})`
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
  return result.changes > 0;
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
```

- [ ] **Step 3: Commit**

```bash
git add worker/schema.sql worker/src/db.ts
git commit -m "feat(worker): add D1 schema and database helpers"
```

---

### Task A3: Auth middleware (JWT)

**Files:**
- Create: `worker/src/middleware.ts`

**Interfaces:**
- Produces: `authMiddleware` — Hono middleware that verifies JWT cookie and sets `c.var.user`
- Produces: `optionalAuth` — same but doesn't reject, sets `c.var.user` to null if unauthenticated
- Produces: `createToken(user)` — creates JWT
- Produces: `setAuthCookie(c, token)` — sets httpOnly cookie

- [ ] **Step 1: Create worker/src/middleware.ts**

```typescript
import type { Context, Next } from "hono";
import { SignJWT, jwtVerify } from "jose";
import type { UserRow } from "./db";

export interface AuthUser {
  sub: string;
  email: string;
  name: string | null;
}

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser | null;
  }
}

function getSecret(env: { JWT_SECRET: string }): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function createToken(
  user: UserRow,
  secret: string
): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .setIssuedAt()
    .sign(new TextEncoder().encode(secret));
}

export function setAuthCookie(c: Context, token: string): void {
  c.header(
    "Set-Cookie",
    `auth_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
  );
}

export function clearAuthCookie(c: Context): void {
  c.header(
    "Set-Cookie",
    `auth_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
  );
}

export async function authMiddleware(c: Context, next: Next): Promise<void> {
  const cookie = c.req.header("Cookie") ?? "";
  const match = cookie.match(/auth_token=([^;]+)/);
  const token = match ? match[1] : null;

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const { payload } = await jwtVerify(token, getSecret(c.env as { JWT_SECRET: string }));
    c.set("user", payload as unknown as AuthUser);
    await next();
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
}

export async function optionalAuth(c: Context, next: Next): Promise<void> {
  const cookie = c.req.header("Cookie") ?? "";
  const match = cookie.match(/auth_token=([^;]+)/);
  const token = match ? match[1] : null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret(c.env as { JWT_SECRET: string }));
      c.set("user", payload as unknown as AuthUser);
    } catch {
      c.set("user", null);
    }
  } else {
    c.set("user", null);
  }
  await next();
}
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/middleware.ts
git commit -m "feat(worker): add JWT auth middleware"
```

---

### Task A4: Auth routes (GitHub, Google, Email)

**Files:**
- Create: `worker/src/auth.ts`

**Interfaces:**
- Consumes: `getDB` from db.ts, `createToken`, `setAuthCookie`, `clearAuthCookie`, `authMiddleware` from middleware.ts
- Produces: `authRoutes` Hono router with all auth endpoints

- [ ] **Step 1: Create worker/src/auth.ts**

```typescript
import { Hono } from "hono";
import { getDB, findOrCreateUser } from "./db";
import { createToken, setAuthCookie, clearAuthCookie, authMiddleware } from "./middleware";

const authRoutes = new Hono();

// GET /api/auth/github — redirect to GitHub OAuth
authRoutes.get("/github", (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
  return c.redirect(url);
});

// GET /api/auth/github/callback — handle GitHub OAuth callback
authRoutes.get("/github/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.json({ error: "Missing code" }, 400);

  const clientId = c.env.GITHUB_CLIENT_ID;
  const clientSecret = c.env.GITHUB_CLIENT_SECRET;

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) return c.json({ error: "GitHub auth failed" }, 401);

  // Fetch user profile
  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "ai-daily-pulse" },
  });
  const ghUser = await userRes.json() as { id: number; login: string; avatar_url: string; email?: string };

  // Fetch email if not public
  let email = ghUser.email;
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "ai-daily-pulse" },
    });
    const emails = await emailsRes.json() as Array<{ email: string; primary: boolean }>;
    email = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? `${ghUser.login}@github.com`;
  }

  const db = getDB(c);
  const user = await findOrCreateUser(db, {
    email,
    name: ghUser.login,
    avatar_url: ghUser.avatar_url,
    provider: "github",
    provider_id: String(ghUser.id),
  });

  const token = await createToken(user, c.env.JWT_SECRET);
  setAuthCookie(c, token);

  return c.redirect(`${c.env.FRONTEND_URL}/insight?authed=true`);
});

// GET /api/auth/google — redirect to Google OAuth
authRoutes.get("/google", (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`;
  return c.redirect(url);
});

// GET /api/auth/google/callback — handle Google OAuth callback
authRoutes.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.json({ error: "Missing code" }, 400);

  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const tokenData = await tokenRes.json() as { access_token?: string; id_token?: string; error?: string };
  if (!tokenData.access_token) return c.json({ error: "Google auth failed" }, 401);

  // Fetch user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const gUser = await userRes.json() as { id: string; email: string; name: string; picture: string };

  const db = getDB(c);
  const user = await findOrCreateUser(db, {
    email: gUser.email,
    name: gUser.name,
    avatar_url: gUser.picture,
    provider: "google",
    provider_id: gUser.id,
  });

  const token = await createToken(user, c.env.JWT_SECRET);
  setAuthCookie(c, token);

  return c.redirect(`${c.env.FRONTEND_URL}/insight?authed=true`);
});

// POST /api/auth/email/send — send verification code
authRoutes.post("/email/send", async (c) => {
  const { email } = await c.req.json<{ email: string }>();
  if (!email || !email.includes("@")) return c.json({ error: "Invalid email" }, 400);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 minutes

  const db = getDB(c);
  await db.prepare("INSERT INTO email_codes (email, code, expires_at) VALUES (?, ?, ?)")
    .bind(email, code, expiresAt).run();

  // Send via Resend
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "AI Daily Pulse <noreply@ai-daily-pulse.top>",
      to: [email],
      subject: "Your verification code",
      html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 5 minutes.</p>`,
    }),
  });

  return c.json({ ok: true });
});

// POST /api/auth/email/verify — verify code and login
authRoutes.post("/email/verify", async (c) => {
  const { email, code } = await c.req.json<{ email: string; code: string }>();
  if (!email || !code) return c.json({ error: "Missing email or code" }, 400);

  const db = getDB(c);
  const now = Math.floor(Date.now() / 1000);

  const record = await db
    .prepare("SELECT * FROM email_codes WHERE email = ? AND code = ? AND expires_at > ? AND used = 0 ORDER BY id DESC LIMIT 1")
    .bind(email, code, now)
    .first<{ id: number }>();

  if (!record) return c.json({ error: "Invalid or expired code" }, 401);

  await db.prepare("UPDATE email_codes SET used = 1 WHERE id = ?").bind(record.id).run();

  const user = await findOrCreateUser(db, { email, provider: "email" });
  const token = await createToken(user, c.env.JWT_SECRET);
  setAuthCookie(c, token);

  return c.json({ ok: true });
});

// GET /api/me — current user
authRoutes.get("/me", authMiddleware, (c) => {
  return c.json(c.var.user);
});

// POST /api/auth/logout — clear session
authRoutes.post("/logout", (c) => {
  clearAuthCookie(c);
  return c.json({ ok: true });
});

export { authRoutes };
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/auth.ts
git commit -m "feat(worker): add auth routes (GitHub, Google, Email)"
```

---

### Task A5: Ideas routes

**Files:**
- Create: `worker/src/ideas.ts`

**Interfaces:**
- Consumes: `getDB`, `getAllIdeasWithVotes` from db.ts, `optionalAuth` from middleware.ts
- Produces: `ideasRoutes` Hono router

- [ ] **Step 1: Create worker/src/ideas.ts**

```typescript
import { Hono } from "hono";
import { getDB, getAllIdeasWithVotes } from "./db";
import { optionalAuth } from "./middleware";

const ideasRoutes = new Hono();

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
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/ideas.ts
git commit -m "feat(worker): add ideas routes with sync endpoint"
```

---

### Task A6: Vote routes

**Files:**
- Create: `worker/src/vote.ts`

**Interfaces:**
- Consumes: `getDB`, `upsertVote`, `deleteVote` from db.ts, `authMiddleware` from middleware.ts
- Produces: `voteRoutes` Hono router

- [ ] **Step 1: Create worker/src/vote.ts**

```typescript
import { Hono } from "hono";
import { getDB, upsertVote, deleteVote } from "./db";
import { authMiddleware } from "./middleware";

const voteRoutes = new Hono();

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
```

- [ ] **Step 2: Commit**

```bash
git add worker/src/vote.ts
git commit -m "feat(worker): add vote routes (cast, delete, my-votes)"
```

---

### Task A7: Wire up worker entry point

**Files:**
- Modify: `worker/src/index.ts`

**Interfaces:**
- Consumes: `authRoutes` from auth.ts, `ideasRoutes` from ideas.ts, `voteRoutes` from vote.ts

- [ ] **Step 1: Update worker/src/index.ts**

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./auth";
import { ideasRoutes } from "./ideas";
import { voteRoutes } from "./vote";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["https://ai-daily-pulse.top", "http://localhost:3000"],
    credentials: true,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.route("/api/auth", authRoutes);
app.route("/api", ideasRoutes);
app.route("/api", voteRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));

export default app;
```

- [ ] **Step 2: Verify worker compiles**

```bash
cd worker && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/index.ts
git commit -m "feat(worker): wire up all routes in entry point"
```

---

## Part B: Frontend

### Task B1: Types and API client updates

**Files:**
- Modify: `web/lib/types.ts`
- Modify: `web/lib/api.ts`

**Interfaces:**
- Produces: `InsightIdea` type, `VoteCounts` type, `VoteType` type
- Produces: `fetchIdeas()`, `castVote()`, `removeVote()`, `fetchMyVotes()`, `fetchMe()` functions

- [ ] **Step 1: Add types to web/lib/types.ts**

Add at end of file:

```typescript
export type VoteType = "good" | "maybe" | "dont";

export type VoteCounts = {
  good: number;
  maybe: number;
  dont: number;
  total: number;
};

export type InsightIdea = {
  id: string;
  date: string;
  name: string;
  description: string | null;
  target_user: string | null;
  core_features: string[];
  related_trends: string[];
  why_now: string | null;
  monetization: string | null;
  difficulty: string | null;
  estimated_mvp_days: number | null;
  source_article: string | null;
  source_article_url: string | null;
  source_article_score: number | null;
  source_article_source: string | null;
  social_pulse: BuildProject["social_pulse"] | null;
  votes: VoteCounts;
  my_vote: VoteType | null;
};

export type AuthUser = {
  sub: string;
  email: string;
  name: string | null;
};
```

- [ ] **Step 2: Add API client functions to web/lib/api.ts**

Add at end of file:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.ai-daily-pulse.top";

export async function fetchIdeas(): Promise<InsightIdea[]> {
  const res = await fetch(`${API_BASE}/api/ideas`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch ideas: ${res.status}`);
  const data = await res.json();
  return data.ideas;
}

export async function castVote(
  ideaId: string,
  voteType: VoteType
): Promise<VoteCounts> {
  const res = await fetch(`${API_BASE}/api/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idea_id: ideaId, vote_type: voteType }),
  });
  if (!res.ok) throw new Error(`Failed to vote: ${res.status}`);
  const data = await res.json();
  return data.votes;
}

export async function removeVote(ideaId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/vote/${ideaId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to remove vote: ${res.status}`);
}

export async function fetchMyVotes(): Promise<{ idea_id: string; vote_type: VoteType }[]> {
  const res = await fetch(`${API_BASE}/api/my-votes`, {
    credentials: "include",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.votes;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(`${API_BASE}/api/me`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
```

- [ ] **Step 3: Add import for new types in api.ts**

Add at top of api.ts after existing imports:

```typescript
import type { InsightIdea, VoteType, VoteCounts, AuthUser } from "./types";
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add web/lib/types.ts web/lib/api.ts
git commit -m "feat(web): add Insight types and API client functions"
```

---

### Task B2: AuthProvider context

**Files:**
- Create: `web/lib/auth.tsx`

**Interfaces:**
- Consumes: `fetchMe`, `logout` from api.ts
- Produces: `AuthProvider` component, `useAuth()` hook

- [ ] **Step 1: Create web/lib/auth.tsx**

```typescript
"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "./types";
import { fetchMe, logout as apiLogout } from "./api";

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: () => void; // opens modal — handled by AuthModal
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const u = await fetchMe();
    setUser(u);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleLogout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login: () => {}, // AuthModal handles this
        logout: handleLogout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/auth.tsx
git commit -m "feat(web): add AuthProvider context and useAuth hook"
```

---

### Task B3: AuthModal component

**Files:**
- Create: `web/components/AuthModal.tsx`

**Interfaces:**
- Consumes: `useAuth()` from auth.tsx
- Produces: `AuthModal` component — modal with GitHub, Google, Email login options

- [ ] **Step 1: Create web/components/AuthModal.tsx**

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.ai-daily-pulse.top";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AuthModal({ open, onClose }: Props) {
  const t = useTranslations("insight");
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"select" | "email" | "verify">("select");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleOAuth = (provider: "github" | "google") => {
    window.location.href = `${API_BASE}/api/auth/${provider}`;
  };

  const handleSendCode = async () => {
    if (!email.includes("@")) {
      setError(t("authInvalidEmail"));
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed");
      setMode("verify");
    } catch {
      setError(t("authSendFailed"));
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/email/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t("authVerifyFailed"));
        return;
      }
      await refresh();
      onClose();
      setMode("select");
      setEmail("");
      setCode("");
    } catch {
      setError(t("authVerifyFailed"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted hover:text-foreground text-lg"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold mb-4">{t("authTitle")}</h2>

        {mode === "select" && (
          <div className="space-y-3">
            <button
              onClick={() => handleOAuth("github")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border hover:bg-surface-muted transition-colors text-sm font-medium"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              {t("authGithub")}
            </button>

            <button
              onClick={() => handleOAuth("google")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border hover:bg-surface-muted transition-colors text-sm font-medium"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t("authGoogle")}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted">{t("authOr")}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={() => setMode("email")}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border hover:bg-surface-muted transition-colors text-sm font-medium"
            >
              ✉️ {t("authEmail")}
            </button>
          </div>
        )}

        {mode === "email" && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t("authEmailHint")}</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-foreground placeholder:text-muted"
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setMode("select"); setError(""); }}
                className="flex-1 px-4 py-2 rounded-md border border-border text-sm hover:bg-surface-muted transition-colors"
              >
                {t("authBack")}
              </button>
              <button
                onClick={handleSendCode}
                disabled={sending}
                className="flex-1 px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {sending ? t("authSending") : t("authSendCode")}
              </button>
            </div>
          </div>
        )}

        {mode === "verify" && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t("authVerifyHint", { email })}</p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-foreground placeholder:text-muted text-center text-2xl tracking-[0.3em]"
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setMode("email"); setError(""); }}
                className="flex-1 px-4 py-2 rounded-md border border-border text-sm hover:bg-surface-muted transition-colors"
              >
                {t("authBack")}
              </button>
              <button
                onClick={handleVerify}
                disabled={code.length !== 6}
                className="flex-1 px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {t("authVerify")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/AuthModal.tsx
git commit -m "feat(web): add AuthModal component with GitHub, Google, Email login"
```

---

### Task B4: VoteBar component

**Files:**
- Create: `web/components/VoteBar.tsx`

**Interfaces:**
- Consumes: `VoteCounts`, `VoteType` from types.ts, `castVote` from api.ts, `useAuth()` from auth.tsx
- Produces: `VoteBar` component — three buttons + percentage bar

- [ ] **Step 1: Create web/components/VoteBar.tsx**

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { VoteCounts, VoteType } from "@/lib/types";
import { castVote } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Props = {
  ideaId: string;
  votes: VoteCounts;
  myVote: VoteType | null;
  onVoteChange: (ideaId: string, votes: VoteCounts, myVote: VoteType | null) => void;
  onAuthRequired: () => void;
};

const VOTE_OPTIONS: { type: VoteType; emoji: string; color: string }[] = [
  { type: "good", emoji: "👍", color: "bg-emerald-500" },
  { type: "maybe", emoji: "🤔", color: "bg-amber-500" },
  { type: "dont", emoji: "👎", color: "bg-red-400" },
];

export function VoteBar({ ideaId, votes, myVote, onVoteChange, onAuthRequired }: Props) {
  const t = useTranslations("insight");
  const { user } = useAuth();
  const [loading, setLoading] = useState<VoteType | null>(null);

  const handleVote = async (voteType: VoteType) => {
    if (!user) {
      onAuthRequired();
      return;
    }
    setLoading(voteType);
    try {
      const newVotes = await castVote(ideaId, voteType);
      onVoteChange(ideaId, newVotes, voteType);
    } catch {
      // Silently fail — keep optimistic state
    } finally {
      setLoading(null);
    }
  };

  const maxVotes = Math.max(votes.total, 1);

  return (
    <div className="space-y-2">
      {/* Buttons */}
      <div className="flex items-center gap-2">
        {VOTE_OPTIONS.map(({ type, emoji }) => (
          <button
            key={type}
            onClick={() => handleVote(type)}
            disabled={loading === type}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              myVote === type
                ? "bg-accent/10 text-accent ring-1 ring-accent/30"
                : "bg-surface-muted text-muted hover:text-foreground hover:bg-surface"
            } disabled:opacity-50`}
            aria-pressed={myVote === type}
            aria-label={t(`vote${type.charAt(0).toUpperCase() + type.slice(1)}`)}
          >
            <span className="text-base">{emoji}</span>
            <span className="tabular-nums text-xs">{votes[type]}</span>
          </button>
        ))}
        <span className="text-xs text-muted ml-auto tabular-nums">
          {t("voteTotal", { count: votes.total })}
        </span>
      </div>

      {/* Percentage bar */}
      <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-muted">
        <div
          className="bg-emerald-500 transition-all duration-300"
          style={{ width: `${(votes.good / maxVotes) * 100}%` }}
        />
        <div
          className="bg-amber-500 transition-all duration-300"
          style={{ width: `${(votes.maybe / maxVotes) * 100}%` }}
        />
        <div
          className="bg-red-400 transition-all duration-300"
          style={{ width: `${(votes.dont / maxVotes) * 100}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/VoteBar.tsx
git commit -m "feat(web): add VoteBar component with three-tier voting"
```

---

### Task B5: InsightCard component

**Files:**
- Create: `web/components/InsightCard.tsx`

**Interfaces:**
- Consumes: `InsightIdea` from types.ts, `VoteBar` from VoteBar.tsx
- Produces: `InsightCard` component

- [ ] **Step 1: Create web/components/InsightCard.tsx**

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { InsightIdea, VoteCounts, VoteType } from "@/lib/types";
import { VoteBar } from "./VoteBar";

type Props = {
  idea: InsightIdea;
  index: number;
  onVoteChange: (ideaId: string, votes: VoteCounts, myVote: VoteType | null) => void;
  onAuthRequired: () => void;
};

const difficultyLabels: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

export function InsightCard({ idea, index, onVoteChange, onAuthRequired }: Props) {
  const t = useTranslations("insight");
  const [expanded, setExpanded] = useState(false);

  const hasDetails =
    (idea.core_features && idea.core_features.length > 0) ||
    idea.source_article ||
    (idea.related_trends && idea.related_trends.length > 0) ||
    idea.target_user ||
    idea.monetization;

  return (
    <article
      className="border border-border animate-slide-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
    >
      <div className="p-5">
        {/* Row 1: name + meta */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-mono text-muted tabular-nums shrink-0">
              #{String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-semibold text-[15px] leading-snug text-foreground truncate">
              {idea.name}
            </h3>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs text-muted">
              {difficultyLabels[idea.difficulty ?? ""] ?? idea.difficulty}
            </span>
            {idea.estimated_mvp_days != null && (
              <>
                <span className="w-px h-3 bg-border" />
                <span className="text-xs text-muted font-mono tabular-nums">
                  {t("mvpDays", { days: idea.estimated_mvp_days })}
                </span>
              </>
            )}
            <span className="w-px h-3 bg-border" />
            <span className="text-xs text-muted font-mono">{idea.date}</span>
          </div>
        </div>

        {/* Row 2: description */}
        <p className="text-sm text-muted leading-relaxed mb-3">
          {idea.description}
        </p>

        {/* Row 3: Why Now */}
        {idea.why_now && (
          <div className="border-l-2 border-accent/40 pl-3 mb-3">
            <p className="text-sm text-foreground/80 leading-relaxed">
              <span className="font-semibold text-accent">{t("whyNow")}</span>
              {" "}{idea.why_now}
            </p>
          </div>
        )}

        {/* Row 4: Vote bar */}
        <VoteBar
          ideaId={idea.id}
          votes={idea.votes}
          myVote={idea.my_vote}
          onVoteChange={onVoteChange}
          onAuthRequired={onAuthRequired}
        />

        {/* Expand toggle */}
        {hasDetails && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors mt-3"
            aria-expanded={expanded}
          >
            <span>{expanded ? t("collapse") : t("expand")}</span>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="border-t border-border px-5 py-4 space-y-3 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {idea.target_user && (
              <div>
                <span className="text-xs font-medium text-foreground/70">{t("targetUser")}</span>
                <p className="text-xs text-muted mt-0.5">{idea.target_user}</p>
              </div>
            )}
            {idea.monetization && (
              <div>
                <span className="text-xs font-medium text-foreground/70">{t("monetization")}</span>
                <p className="text-xs text-muted mt-0.5">{idea.monetization}</p>
              </div>
            )}
          </div>

          {idea.core_features && idea.core_features.length > 0 && (
            <div>
              <span className="text-xs font-medium text-foreground/70">{t("coreFeatures")}</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {idea.core_features.map((f, j) => (
                  <span key={j} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs bg-surface-muted text-muted border border-border/50">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {idea.source_article && (
            <div className="text-xs">
              <span className="font-medium text-foreground/70">{t("sourceArticle")}: </span>
              {idea.source_article_url ? (
                <a href={idea.source_article_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:opacity-70 transition-opacity">
                  {idea.source_article}
                </a>
              ) : (
                <span className="text-muted">{idea.source_article}</span>
              )}
              {idea.source_article_source && (
                <span className="text-muted ml-1">
                  ({idea.source_article_source}
                  {idea.source_article_score != null && `, ${idea.source_article_score}/10`})
                </span>
              )}
            </div>
          )}

          {idea.related_trends && idea.related_trends.length > 0 && (
            <div>
              <span className="text-xs font-medium text-foreground/70">{t("relatedTrends")}</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {idea.related_trends.map((tag, j) => (
                  <span key={j} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-accent/10 text-accent font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/InsightCard.tsx
git commit -m "feat(web): add InsightCard component"
```

---

### Task B6: InsightClient component

**Files:**
- Create: `web/components/InsightClient.tsx`

**Interfaces:**
- Consumes: `InsightIdea`, `VoteCounts`, `VoteType` from types.ts, `fetchIdeas` from api.ts, `InsightCard` from InsightCard.tsx, `AuthModal` from AuthModal.tsx, `useAuth()` from auth.tsx
- Produces: `InsightClient` component

- [ ] **Step 1: Create web/components/InsightClient.tsx**

```typescript
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { InsightIdea, VoteCounts, VoteType } from "@/lib/types";
import { fetchIdeas } from "@/lib/api";
import { InsightCard } from "./InsightCard";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/lib/auth";

type SortKey = "votes_good" | "votes_total" | "date_newest" | "difficulty";

const SORT_OPTIONS: { key: SortKey; labelKey: string }[] = [
  { key: "votes_good", labelKey: "sortVotesGood" },
  { key: "votes_total", labelKey: "sortVotesTotal" },
  { key: "date_newest", labelKey: "sortDateNewest" },
  { key: "difficulty", labelKey: "sortDifficulty" },
];

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"] as const;

export function InsightClient() {
  const t = useTranslations("insight");
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<InsightIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortKey>("votes_good");
  const [difficultyFilter, setDifficultyFilter] = useState<Set<string>>(new Set());
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    fetchIdeas()
      .then(setIdeas)
      .catch(() => setError(t("loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  const handleVoteChange = useCallback(
    (ideaId: string, votes: VoteCounts, myVote: VoteType | null) => {
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.id === ideaId ? { ...idea, votes, my_vote: myVote } : idea
        )
      );
    },
    []
  );

  const filtered = useMemo(() => {
    return ideas
      .filter((idea) => {
        if (difficultyFilter.size > 0 && idea.difficulty && !difficultyFilter.has(idea.difficulty))
          return false;
        if (dateStart && idea.date < dateStart) return false;
        if (dateEnd && idea.date > dateEnd) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sort) {
          case "votes_good":
            return b.votes.good - a.votes.good || b.votes.total - a.votes.total;
          case "votes_total":
            return b.votes.total - a.votes.total;
          case "date_newest":
            return b.date.localeCompare(a.date);
          case "difficulty": {
            const order = { easy: 0, medium: 1, hard: 2 };
            return (order[a.difficulty as keyof typeof order] ?? 3) - (order[b.difficulty as keyof typeof order] ?? 3);
          }
          default:
            return 0;
        }
      });
  }, [ideas, sort, difficultyFilter, dateStart, dateEnd]);

  const toggleDifficulty = (d: string) => {
    setDifficultyFilter((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const allDates = useMemo(() => {
    const dates = [...new Set(ideas.map((i) => i.date))].sort().reverse();
    return dates;
  }, [ideas]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-muted text-sm">{t("loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Left sidebar: filters */}
      <aside className="w-full md:w-48 shrink-0">
        <h1 className="text-headline mb-1">{t("title")}</h1>
        <p className="text-sm text-muted mb-4">{t("subtitle")}</p>

        {/* Sort */}
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-3">
          {t("sortLabel")}
        </h3>
        <div className="space-y-1 mb-6">
          {SORT_OPTIONS.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                sort === key
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-muted hover:text-foreground hover:bg-surface-muted"
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Difficulty filter */}
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-3">
          {t("difficultyFilter")}
        </h3>
        <div className="space-y-1 mb-6">
          {DIFFICULTY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => toggleDifficulty(d)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                difficultyFilter.has(d)
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-muted hover:text-foreground hover:bg-surface-muted"
              }`}
            >
              {t(`difficulty${d.charAt(0).toUpperCase() + d.slice(1)}`)}
            </button>
          ))}
        </div>

        {/* Date range filter */}
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-3">
          {t("dateFilter")}
        </h3>
        <div className="space-y-2">
          <select
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-border bg-surface text-xs text-foreground"
          >
            <option value="">{t("dateFrom")}</option>
            {allDates.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-border bg-surface text-xs text-foreground"
          >
            <option value="">{t("dateTo")}</option>
            {allDates.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* User info */}
        {user && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted truncate">{user.email}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Right: ideas */}
      <div className="flex-1 min-w-0">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted">
              {t("ideaCount", { count: filtered.length })}
            </p>
            {filtered.map((idea, i) => (
              <InsightCard
                key={idea.id}
                idea={idea}
                index={i}
                onVoteChange={handleVoteChange}
                onAuthRequired={() => setAuthOpen(true)}
              />
            ))}
          </div>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/InsightClient.tsx
git commit -m "feat(web): add InsightClient component with sort, filter, and auth"
```

---

### Task B7: Insight page route

**Files:**
- Create: `web/app/[locale]/insight/page.tsx`
- Modify: `web/app/layout.tsx` (wrap with AuthProvider)

**Interfaces:**
- Consumes: `InsightClient` from InsightClient.tsx, `AuthProvider` from auth.tsx

- [ ] **Step 1: Create web/app/[locale]/insight/page.tsx**

```typescript
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InsightClient } from "@/components/InsightClient";
import { getBaseMetadata } from "@/lib/metadata";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("insight");
  const siteUrl = "https://ai-daily-pulse.top";
  const base = getBaseMetadata(locale, "/insight/");
  const title = t("title");
  const desc = t("subtitle");

  return {
    title,
    description: desc,
    alternates: {
      ...base.alternates,
      canonical: `${siteUrl}/${locale}/insight/`,
    },
    openGraph: {
      ...base.openGraph,
      title,
      description: desc,
      url: `${siteUrl}/${locale}/insight/`,
    },
    twitter: {
      ...base.twitter,
      title,
      description: desc,
    },
  };
}

export default async function InsightPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <InsightClient />;
}
```

- [ ] **Step 2: Wrap layout with AuthProvider in web/app/[locale]/layout.tsx**

In `web/app/[locale]/layout.tsx`, add the import:

```typescript
import { AuthProvider } from "@/lib/auth";
```

Then wrap the `{children}` inside `<NextIntlClientProvider>` with `<AuthProvider>`:

```typescript
<NextIntlClientProvider messages={messages}>
  <AuthProvider>
    <div className="min-h-[100dvh] flex flex-col">
      {/* ... header, main, footer unchanged ... */}
    </div>
  </AuthProvider>
</NextIntlClientProvider>
```

The `AuthProvider` must be inside `NextIntlClientProvider` because it uses `useTranslations` via child components.

- [ ] **Step 3: Commit**

```bash
git add web/app/[locale]/insight/page.tsx web/app/layout.tsx
git commit -m "feat(web): add Insight page route with AuthProvider"
```

---

### Task B8: i18n messages

**Files:**
- Modify: `web/messages/zh-CN.json`
- Modify: `web/messages/zh-TW.json`
- Modify: `web/messages/en.json`

- [ ] **Step 1: Add insight translations to zh-CN.json**

Replace the existing `"builder"` key with `"insight"` and add new keys:

```json
"insight": {
  "title": "项目灵感",
  "subtitle": "基于 AI 日报提炼的可做项目，社区投票选出最值得做的方向",
  "loading": "加载中...",
  "loadFailed": "加载失败，请稍后重试",
  "empty": "暂无项目灵感",
  "ideaCount": "共 {count} 个项目",
  "sortLabel": "排序",
  "sortVotesGood": "👍 最多",
  "sortVotesTotal": "总票数",
  "sortDateNewest": "最新",
  "sortDifficulty": "难度",
  "difficultyFilter": "难度筛选",
  "difficultyEasy": "简单",
  "difficultyMedium": "中等",
  "difficultyHard": "困难",
  "dateFilter": "日期范围",
  "dateFrom": "起始日期",
  "dateTo": "截止日期",
  "voteGood": "看好",
  "voteMaybe": "观望",
  "voteDont": "不看好",
  "voteTotal": "{count} 票",
  "whyNow": "为什么是现在",
  "targetUser": "目标用户",
  "coreFeatures": "核心功能",
  "monetization": "变现模式",
  "sourceArticle": "来源文章",
  "relatedTrends": "相关趋势",
  "mvpDays": "{days}天 MVP",
  "expand": "展开详情",
  "collapse": "收起详情",
  "authTitle": "登录以投票",
  "authGithub": "使用 GitHub 登录",
  "authGoogle": "使用 Google 登录",
  "authOr": "或",
  "authEmail": "使用邮箱登录",
  "authEmailHint": "输入邮箱，我们会发送验证码",
  "authSendCode": "发送验证码",
  "authSending": "发送中...",
  "authVerifyHint": "验证码已发送到 {email}",
  "authVerify": "验证",
  "authBack": "返回",
  "authInvalidEmail": "请输入有效的邮箱地址",
  "authSendFailed": "发送失败，请稍后重试",
  "authVerifyFailed": "验证失败，请检查验证码"
}
```

- [ ] **Step 2: Add insight translations to zh-TW.json**

Same structure as zh-CN but with Traditional Chinese variants.

- [ ] **Step 3: Add insight translations to en.json**

```json
"insight": {
  "title": "Project Ideas",
  "subtitle": "Actionable projects distilled from AI daily, ranked by community votes",
  "loading": "Loading...",
  "loadFailed": "Failed to load, please retry",
  "empty": "No project ideas yet",
  "ideaCount": "{count} ideas",
  "sortLabel": "Sort",
  "sortVotesGood": "👍 Most Good",
  "sortVotesTotal": "Total Votes",
  "sortDateNewest": "Newest",
  "sortDifficulty": "Difficulty",
  "difficultyFilter": "Difficulty",
  "difficultyEasy": "Easy",
  "difficultyMedium": "Medium",
  "difficultyHard": "Hard",
  "dateFilter": "Date Range",
  "dateFrom": "From",
  "dateTo": "To",
  "voteGood": "Good",
  "voteMaybe": "Maybe",
  "voteDont": "Don't",
  "voteTotal": "{count} votes",
  "whyNow": "Why now",
  "targetUser": "Target user",
  "coreFeatures": "Core features",
  "monetization": "Monetization",
  "sourceArticle": "Source article",
  "relatedTrends": "Related trends",
  "mvpDays": "{days}d MVP",
  "expand": "Expand",
  "collapse": "Collapse",
  "authTitle": "Sign in to vote",
  "authGithub": "Sign in with GitHub",
  "authGoogle": "Sign in with Google",
  "authOr": "or",
  "authEmail": "Sign in with Email",
  "authEmailHint": "Enter your email, we'll send a verification code",
  "authSendCode": "Send code",
  "authSending": "Sending...",
  "authVerifyHint": "Code sent to {email}",
  "authVerify": "Verify",
  "authBack": "Back",
  "authInvalidEmail": "Please enter a valid email",
  "authSendFailed": "Failed to send, please retry",
  "authVerifyFailed": "Verification failed, please check your code"
}
```

- [ ] **Step 4: Keep old "builder" key for backward compatibility**

The old `"builder"` key should remain in the JSON files since existing components (BuilderOverview, BuilderProjectCard) still reference it. These will be cleaned up in Task B10.

- [ ] **Step 5: Commit**

```bash
git add web/messages/
git commit -m "feat(web): add insight i18n messages for zh-CN, zh-TW, en"
```

---

### Task B9: Navigation update

**Files:**
- Modify: `web/components/HeaderNav.tsx`

- [ ] **Step 1: Update HeaderNav to use /insight instead of /builder**

In `web/components/HeaderNav.tsx`, change the builder link:

```typescript
// Change this line:
{ href: `/${locale}/builder`, label: t("builder"), match: (p: string) => p.includes("/builder") },
// To:
{ href: `/${locale}/insight`, label: t("insight"), match: (p: string) => p.includes("/insight") },
```

- [ ] **Step 2: Update nav translations in all locale files**

In each locale's JSON, add `"insight": "项目灵感"` (or equivalent) to the `"nav"` section. Keep `"builder"` for now (backward compat).

- [ ] **Step 3: Commit**

```bash
git add web/components/HeaderNav.tsx web/messages/
git commit -m "feat(web): update navigation to point to /insight"
```

---

### Task B10: Redirects and cleanup

**Files:**
- Create: `web/app/[locale]/builder/page.tsx` (client-side redirect)
- Create: `web/app/[locale]/builder/[date]/page.tsx` (client-side redirect)
- Modify: `web/next.config.mjs` (add NEXT_PUBLIC_API_URL env)

**Note:** `redirects()` in next.config.mjs does NOT work with `output: "export"`. Use client-side redirect components instead.

- [ ] **Step 1: Create client-side redirect for /builder**

Create `web/app/[locale]/builder/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function BuilderRedirect() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "zh-CN";

  useEffect(() => {
    router.replace(`/${locale}/insight`);
  }, [router, locale]);

  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-muted">Redirecting to Insight...</p>
    </div>
  );
}
```

- [ ] **Step 2: Create client-side redirect for /builder/[date]**

Create `web/app/[locale]/builder/[date]/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function BuilderDateRedirect() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "zh-CN";

  useEffect(() => {
    router.replace(`/${locale}/insight`);
  }, [router, locale]);

  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-muted">Redirecting to Insight...</p>
    </div>
  );
}
```

- [ ] **Step 3: Add NEXT_PUBLIC_API_URL to next.config.mjs**

```javascript
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "https://api.ai-daily-pulse.top",
  },
};
```

- [ ] **Step 4: Verify build**

```bash
cd web && npm run build
```

Expected: Build succeeds, no errors. `/builder` and `/builder/*` pages exist with redirect logic.

- [ ] **Step 5: Commit**

```bash
git add web/app/[locale]/builder/ web/next.config.mjs
git commit -m "feat(web): add builder→insight client-side redirects, API URL env"
```

---

## Part C: Python Sync

### Task C1: sync_insights.py module

**Files:**
- Create: `src/sync_insights.py`

**Interfaces:**
- Consumes: `config.toml` for API URL and sync key
- Produces: `sync_insights(directions, date)` function

- [ ] **Step 1: Create src/sync_insights.py**

```python
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
```

- [ ] **Step 2: Add sync call to main.py**

In `main.py`, after the writer step, add:

```python
# Sync insights to Worker API
if config.get("insight_sync_enabled", False):
    from src.sync_insights import sync_insights
    sync_insights(directions, date)
```

- [ ] **Step 3: Add config keys to config.toml**

```toml
[insight]
sync_enabled = true
```

- [ ] **Step 4: Commit**

```bash
git add src/sync_insights.py main.py config.toml
git commit -m "feat(python): add sync_insights module for Worker API sync"
```

---

### Task C2: CI workflow updates

**Files:**
- Modify: `.github/workflows/daily.yml`

- [ ] **Step 1: Add sync step to daily.yml**

After the "Run pipeline" step, add:

```yaml
      - name: Sync insights to Worker API
        if: success()
        env:
          INSIGHT_API_URL: ${{ secrets.INSIGHT_API_URL }}
          INSIGHT_SYNC_KEY: ${{ secrets.INSIGHT_SYNC_KEY }}
        run: python -c "from src.sync_insights import sync_insights; sync_insights([], '')"
```

Note: The actual sync is called from `main.py` now. The CI just needs the env vars set. Update the "Run pipeline" step to include the new env vars:

```yaml
      - name: Run pipeline
        env:
          API_KEY: ${{ secrets.API_KEY }}
          INSIGHT_API_URL: ${{ secrets.INSIGHT_API_URL }}
          INSIGHT_SYNC_KEY: ${{ secrets.INSIGHT_SYNC_KEY }}
        run: python main.py
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/daily.yml
git commit -m "ci: add insight sync env vars to daily workflow"
```

---

## Part D: Deployment

### Task D1: Worker deploy workflow

**Files:**
- Create: `.github/workflows/deploy-worker.yml`

- [ ] **Step 1: Create .github/workflows/deploy-worker.yml**

```yaml
name: Deploy Worker

on:
  push:
    branches: [main]
    paths:
      - "worker/**"
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: cd worker && npm ci

      - name: Type check
        run: cd worker && npx tsc --noEmit

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: "worker"
          command: deploy
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-worker.yml
git commit -m "ci: add worker deploy workflow"
```

---

## Verification

### Local development

1. **Worker:** `cd worker && npx wrangler dev` — runs Worker locally
2. **Frontend:** `cd web && NEXT_PUBLIC_API_URL=http://localhost:8787 npm run dev`
3. Test: visit `http://localhost:3000/zh-CN/insight/`, verify ideas load
4. Test auth: click sign in → GitHub/Google OAuth redirect → verify session
5. Test voting: sign in, vote on an idea, reload, verify vote persisted
6. Test email: enter email, check Resend dashboard for sent code, verify login

### CI verification

1. Push to `main` triggers Pages deploy (existing) + Worker deploy (new)
2. After deploy:
   - `curl https://api.ai-daily-pulse.top/api/health` → `{"ok":true}`
   - `curl https://api.ai-daily-pulse.top/api/ideas` → JSON array
   - `curl https://ai-daily-pulse.top/zh-CN/insight/` → 200 HTML
3. Manual: sign in, vote, reload, verify vote persisted

### One-time setup (before first deploy)

1. Create D1 database: `cd worker && npx wrangler d1 create ai-daily-pulse`
2. Update `wrangler.toml` with the returned `database_id`
3. Run schema: `npx wrangler d1 execute ai-daily-pulse --file=schema.sql`
4. Set secrets: `npx wrangler secret put JWT_SECRET`, etc.
5. Add `api` subdomain DNS record in Cloudflare dashboard
6. Add GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `INSIGHT_API_URL`, `INSIGHT_SYNC_KEY`
