# Insight Module Redesign — Design Document

**Date:** 2026-06-25
**Status:** Draft
**Author:** Favor + Claude

---

## 1. Context

### Why this change

The current Builder module shows build directions from a single day's digest only. Users cannot see ideas from previous days, and there is no community feedback mechanism. This redesign:

- Aggregates all builder ideas across all dates into a single view
- Adds a three-tier voting system (Good / Maybe / Don't) so the community can signal which ideas are worth pursuing
- Adds authentication so each user gets exactly one vote per idea
- Renames the module from "Builder" to "Insight"

### Intended outcome

A community-curated list of AI project ideas where the best ideas naturally surface through voting, replacing the current single-day snapshot view.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────┐
│              Cloudflare Pages                      │
│  Next.js static export (output: "export")          │
│  /insight → InsightClient (client component)       │
│  Fetches from api.ai-daily-pulse.top               │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│        Cloudflare Worker (api.ai-daily-pulse.top)  │
│        Framework: Hono                              │
│                                                     │
│  Auth routes:                                       │
│    GET  /api/auth/github          → OAuth redirect  │
│    GET  /api/auth/github/callback → OAuth callback  │
│    GET  /api/auth/google          → OAuth redirect  │
│    GET  /api/auth/google/callback → OAuth callback  │
│    POST /api/auth/email/send      → Send magic link │
│    POST /api/auth/email/verify    → Verify token    │
│    GET  /api/me                   → Current user    │
│    POST /api/auth/logout          → Clear session   │
│                                                     │
│  Idea routes:                                       │
│    GET  /api/ideas                → All ideas+votes │
│    POST /api/ideas/sync           → Sync from CI    │
│                                                     │
│  Vote routes:                                       │
│    POST   /api/vote               → Cast vote       │
│    DELETE /api/vote/:ideaId       → Remove vote     │
│    GET    /api/my-votes           → User's votes    │
└──────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│              Cloudflare D1                         │
│  Tables: users, votes, ideas                       │
└──────────────────────────────────────────────────┘
```

### Repository structure

```
ai-daily-pulse/
├── main.py                    # Python pipeline (unchanged)
├── src/                       # Python source (unchanged)
├── web/                       # Next.js frontend → Cloudflare Pages
│   ├── app/[locale]/insight/  # NEW: Insight page (replaces builder/)
│   │   └── page.tsx
│   ├── components/
│   │   ├── InsightClient.tsx  # NEW: main insight client component
│   │   ├── InsightCard.tsx    # NEW: idea card with voting
│   │   ├── VoteBar.tsx        # NEW: three-button vote + percentage bar
│   │   ├── AuthModal.tsx      # NEW: login modal
│   │   └── ... (existing)
│   └── lib/
│       ├── api.ts             # MODIFIED: add insight API calls
│       └── auth.ts            # NEW: auth context + hooks
├── worker/                    # NEW: Cloudflare Worker
│   ├── src/
│   │   ├── index.ts           # Hono app entry
│   │   ├── auth.ts            # OAuth + email auth handlers
│   │   ├── ideas.ts           # Ideas routes
│   │   ├── vote.ts            # Voting routes
│   │   ├── middleware.ts      # Auth middleware (JWT verification)
│   │   └── db.ts              # D1 helpers
│   ├── wrangler.toml
│   ├── package.json
│   └── schema.sql             # D1 table definitions
├── .github/workflows/
│   ├── daily.yml              # MODIFIED: add idea sync step
│   └── deploy-worker.yml      # NEW: deploy worker on push to main
└── output/                    # digest JSON (unchanged)
```

---

## 3. Backend: Cloudflare Worker

### Tech choices

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | Hono | Lightweight, native Worker support, good DX |
| Auth | Custom OAuth + JWT | No third-party auth service dependency |
| Email | Resend API | Free tier (100/day), simple REST API |
| Session | JWT in httpOnly cookie | Stateless, no server-side session store needed |
| Database | D1 | Native Cloudflare SQLite, free tier sufficient |

### D1 Schema

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- crypto.randomUUID()
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL,        -- 'github' | 'google' | 'email'
  provider_id TEXT,              -- OAuth provider's user ID (null for email)
  created_at INTEGER NOT NULL    -- Unix timestamp
);

-- Ideas table (synced from Python pipeline)
CREATE TABLE ideas (
  id TEXT PRIMARY KEY,           -- SHA-256 hash of source_article_url (12-char hex)
  date TEXT NOT NULL,            -- digest date "YYYY-MM-DD"
  name TEXT NOT NULL,
  description TEXT,
  target_user TEXT,
  core_features TEXT,            -- JSON array
  related_trends TEXT,           -- JSON array
  why_now TEXT,
  monetization TEXT,
  difficulty TEXT,               -- 'easy' | 'medium' | 'hard'
  estimated_mvp_days INTEGER,
  source_article TEXT,
  source_article_url TEXT,
  source_article_score REAL,
  source_article_source TEXT,
  social_pulse_json TEXT,        -- JSON, nullable
  created_at INTEGER NOT NULL
);

-- Votes table
CREATE TABLE votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  idea_id TEXT NOT NULL REFERENCES ideas(id),
  vote_type TEXT NOT NULL,       -- 'good' | 'maybe' | 'dont'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, idea_id)
);

-- Email verification codes (short-lived, 5-min TTL)
CREATE TABLE email_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,            -- 6-digit code
  expires_at INTEGER NOT NULL,   -- Unix timestamp
  used INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_votes_idea_id ON votes(idea_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_ideas_date ON ideas(date);
CREATE INDEX idx_email_codes_email ON email_codes(email);
```

### API Response Formats

**GET /api/ideas** — returns all ideas with aggregated vote counts. Authenticated users also get their own votes (`my_vote` is `null` when unauthenticated).

```json
{
  "ideas": [
    {
      "id": "a1b2c3d4e5f6",
      "date": "2026-06-25",
      "name": "AI-powered inventory management for small ecommerce",
      "description": "...",
      "difficulty": "medium",
      "estimated_mvp_days": 14,
      "target_user": "...",
      "core_features": ["...", "..."],
      "related_trends": ["...", "..."],
      "why_now": "...",
      "monetization": "...",
      "source_article": "...",
      "source_article_url": "...",
      "source_article_score": 8,
      "source_article_source": "Hacker News",
      "social_pulse": null,
      "votes": {
        "good": 5,
        "maybe": 3,
        "dont": 1,
        "total": 9
      },
      "my_vote": "good"
    }
  ]
}
```

**POST /api/vote** — cast or change a vote:

```json
// Request
{ "idea_id": "a1b2c3d4e5f6", "vote_type": "good" }

// Response 200
{ "ok": true, "votes": { "good": 6, "maybe": 3, "dont": 1, "total": 10 } }
```

### Auth Flow

**OAuth (GitHub/Google):**
1. User clicks "Sign in with GitHub" → redirected to `/api/auth/github`
2. Worker redirects to GitHub OAuth authorize URL
3. User approves → GitHub redirects back to `/api/auth/github/callback?code=...`
4. Worker exchanges code for access token, fetches user profile
5. Worker upserts user in D1, creates JWT, sets httpOnly cookie
6. Worker redirects to `{FRONTEND_URL}/insight?authed=true`

**Email Magic Link:**
1. User enters email → POST `/api/auth/email/send` with `{ email }`
2. Worker generates 6-digit code, stores in D1 with 5-min expiry, sends via Resend
3. User enters code → POST `/api/auth/email/verify` with `{ email, code }`
4. Worker verifies code, upserts user, creates JWT, sets httpOnly cookie
5. Returns `{ ok: true }`

**Session:** JWT stored in httpOnly, Secure, SameSite=Lax cookie. Contains `{ sub: user_id, email, name }`. Middleware verifies on protected routes.

### CORS

Worker allows CORS from `https://ai-daily-pulse.top` and `http://localhost:3000` (dev). Credentials enabled for cookies.

---

## 4. Frontend Changes

### Route changes

| Old | New | Notes |
|-----|-----|-------|
| `/[locale]/builder/` | `/[locale]/insight/` | Renamed, aggregated view |
| `/[locale]/builder/[date]/` | `/[locale]/insight/` | Redirect (see below) |
| `/[locale]/builder/[date]/page.tsx` | Deleted | — |

**Backward compatibility:** Add a `next.config.mjs` redirect: `/builder` → `/insight` and `/builder/*` → `/insight` for all locales.

### New components

| Component | Purpose |
|-----------|---------|
| `InsightClient.tsx` | Main client component. Fetches ideas from Worker API, manages sort/filter state, renders cards. |
| `InsightCard.tsx` | Single idea card. Shows name, description, difficulty badge, MVP days, source article link, expandable details. |
| `VoteBar.tsx` | Three horizontal buttons (👍 Good / 🤔 Maybe / 👎 Don't) + three-color percentage bar. Handles optimistic updates. |
| `AuthModal.tsx` | Modal with three login options: GitHub, Google, Email. Handles OAuth redirects and email code flow. |
| `AuthProvider.tsx` | React context for auth state. Provides `user`, `isLoading`, `login()`, `logout()`. Fetches `/api/me` on mount. |

### InsightClient state

```
Sort: "votes_good" | "votes_total" | "date_newest" | "difficulty"
Filters: { difficulty: ("easy"|"medium"|"hard")[], dateRange: { start, end } }
```

### Data flow

1. Page loads → `InsightClient` mounts
2. `AuthProvider` calls `GET /api/me` to check existing session
3. `InsightClient` calls `GET /api/ideas` to fetch all ideas with vote counts
4. User applies sort/filter → client-side filtering (no API call needed, all ideas in memory)
5. User votes → optimistic update on the card, `POST /api/vote` in background, rollback on error
6. Unauthenticated user clicks vote → `AuthModal` opens

### i18n

Add new translation keys for Insight module in `web/messages/{zh-CN,zh-TW,en}.json`:
- Page title, subtitle
- Sort options, filter labels
- Vote button labels, percentage bar aria labels
- Auth modal: "Sign in to vote", provider labels, email input
- Empty state: "No ideas yet"

---

## 5. Data Sync: Python Pipeline → D1

The Python pipeline (`main.py`) generates build directions as part of the daily run. After writing digest JSON files, a new step syncs ideas to D1:

```python
# New module: src/sync_insights.py
def sync_insights_to_worker(directions, date, api_url, api_key):
    """POST new ideas to the Worker API."""
    for idea in directions:
        payload = {
            "id": sha256_hash(idea["source_article_url"])[:12],
            "date": date,
            ...
        }
        requests.post(f"{api_url}/api/ideas/sync", json=payload,
                      headers={"Authorization": f"Bearer {api_key}"})
```

**Sync endpoint security:** `POST /api/ideas/sync` requires a shared secret (`SYNC_API_KEY`) passed as Bearer token. This key is set in both the Worker's secrets and the GitHub Actions secrets.

**CI changes (`.github/workflows/daily.yml`):**
- After `python main.py`, add step: `python -c "from src.sync_insights import sync; sync(...)"`
- Uses `SYNC_API_KEY` from GitHub Secrets

---

## 6. Deployment

### Frontend (Cloudflare Pages)

- **Build command:** `cd web && npm install && npm run build`
- **Output directory:** `web/out`
- **Domain:** `ai-daily-pulse.top`
- **Trigger:** Push to `main` (auto-deploy via Cloudflare Pages Git integration)
- **No changes** to existing Pages setup

### Worker (Cloudflare Workers)

- **Deploy command:** `cd worker && npm install && npx wrangler deploy`
- **Domain:** `api.ai-daily-pulse.top`
- **Trigger:** Push to `main`, path filter `worker/**` (via `.github/workflows/deploy-worker.yml`)
- **DNS:** Add CNAME `api` → Worker `*.workers.dev` subdomain in Cloudflare dashboard (one-time setup)

### Environment Variables & Secrets

**Worker (`wrangler.toml` + `wrangler secret put`):**

| Variable | Source | Notes |
|----------|--------|-------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App | |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App | Secret |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Secret |
| `RESEND_API_KEY` | Resend dashboard | Secret |
| `SYNC_API_KEY` | Generated random string | Secret, shared with CI |
| `JWT_SECRET` | Generated random string | Secret |
| `FRONTEND_URL` | `https://ai-daily-pulse.top` | |
| `D1_DATABASE_ID` | Created by `wrangler d1 create` | Auto in wrangler.toml |

**GitHub Actions Secrets:**

| Variable | Notes |
|----------|-------|
| `CLOUDFLARE_API_TOKEN` | For `wrangler deploy` |
| `SYNC_API_KEY` | Same as Worker's, for idea sync |
| `WORKER_API_URL` | `https://api.ai-daily-pulse.top` |

---

## 7. Verification Plan

### Local development

1. **Worker:** `cd worker && npx wrangler dev --local` — runs Worker locally with local D1
2. **Frontend:** `cd web && npm run dev` — Next.js dev server, points to local Worker
3. Test auth flow: visit `/insight`, click sign in, verify OAuth redirect + session cookie
4. Test voting: sign in, vote on an idea, verify optimistic update + persistence on reload
5. Test email: enter email, receive code in Resend test mode, verify login

### CI verification

1. Push to `main` triggers both Pages deploy and Worker deploy
2. After deploy, run smoke tests:
   - `curl https://api.ai-daily-pulse.top/api/ideas` → returns JSON array
   - `curl https://ai-daily-pulse.top/zh-CN/insight/` → returns 200 HTML
3. Manual: sign in with GitHub, vote, reload page, verify vote persisted

### Edge cases

- **Empty state:** No ideas in D1 → show "No ideas yet" with link to home
- **Expired session:** JWT expired → 401 from API → AuthModal opens
- **Double vote:** UNIQUE constraint on (user_id, idea_id) prevents duplicates at DB level
- **Vote change:** UPSERT on vote — user can change their vote from Good to Maybe, etc.
- **Network error:** Optimistic update rolls back, show toast "Vote failed, please retry"
- **Sync conflict:** Same idea from different dates → UNIQUE on idea ID, newer sync overwrites

---

## 8. Open Questions

1. **GitHub OAuth App:** Who will create it? Needs a GitHub account with access to the org/repo settings.
2. **Google OAuth:** Needs a Google Cloud project. Who will create it?
3. **Resend account:** Who will sign up and provide the API key?
4. **`api.ai-daily-pulse.top` subdomain:** Needs DNS record in Cloudflare dashboard (one-time).
