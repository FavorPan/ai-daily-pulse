import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import { getDB, findOrCreateUser } from "./db";
import { createToken, setAuthCookie, clearAuthCookie, authMiddleware } from "./middleware";

interface Bindings {
  DB: D1Database;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  RESEND_API_KEY: string;
}

const authRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/auth/github/callback — handle GitHub OAuth callback (MUST be before /github to avoid being swallowed by the catch-all)
authRoutes.get("/github/callback", async (c) => {
  try {
    const code = c.req.query("code");
    if (!code) return c.json({ error: "Missing code" }, 400);

    const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET, FRONTEND_URL } = c.env;

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) return c.json({ error: "GitHub auth failed" }, 401);

    // Fetch user profile — guard against non-2xx responses
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "ai-daily-pulse" },
    });
    if (!userRes.ok) {
      const err = await userRes.json().catch(() => ({}));
      console.error("GitHub /user failed", userRes.status, err);
      return c.json({ error: "GitHub user fetch failed" }, 502);
    }
    const ghUser = await userRes.json() as { id: number; login: string; avatar_url: string; email?: string };

    // Fetch email if not public
    let email = ghUser.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "ai-daily-pulse" },
      });
      // Defensively check: if not array (e.g. error object), fall back to placeholder
      const raw = await emailsRes.json();
      const emails = Array.isArray(raw) ? raw as Array<{ email: string; primary: boolean }> : [];
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

    const token = await createToken(user, JWT_SECRET);
    setAuthCookie(c, token);

    return c.redirect(`${FRONTEND_URL}/?authed=true`);
  } catch (err) {
    console.error("GitHub OAuth callback error:", err);
    return c.json({ error: "Internal error", detail: String(err) }, 500);
  }
});

// GET /api/auth/github — redirect to GitHub OAuth (must be AFTER /github/callback)
authRoutes.get("/github", (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
  return c.redirect(url);
});

// GET /api/auth/google/callback — handle Google OAuth callback (must be BEFORE /google)
authRoutes.get("/google/callback", async (c) => {
  try {
    const code = c.req.query("code");
    if (!code) return c.json({ error: "Missing code" }, 400);

    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, FRONTEND_URL } = c.env;
    const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
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
    if (!userRes.ok) {
      const err = await userRes.json().catch(() => ({}));
      console.error("Google userinfo failed", userRes.status, err);
      return c.json({ error: "Google user fetch failed" }, 502);
    }
    const gUser = await userRes.json() as { id: string; email: string; name: string; picture: string };

    const db = getDB(c);
    const user = await findOrCreateUser(db, {
      email: gUser.email,
      name: gUser.name,
      avatar_url: gUser.picture,
      provider: "google",
      provider_id: gUser.id,
    });

    const token = await createToken(user, JWT_SECRET);
    setAuthCookie(c, token);

    return c.redirect(`${FRONTEND_URL}/?authed=true`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return c.json({ error: "Internal error", detail: String(err) }, 500);
  }
});

// GET /api/auth/google — redirect to Google OAuth (must be AFTER /google/callback)
authRoutes.get("/google", (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`;
  return c.redirect(url);
});

// POST /api/auth/email/send — send verification code
authRoutes.post("/email/send", async (c) => {
  try {
    const { email } = await c.req.json<{ email: string }>();
    if (!email || !email.includes("@")) return c.json({ error: "Invalid email" }, 400);

    const { RESEND_API_KEY } = c.env;

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
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AI Daily Pulse <noreply@ai-daily-pulse.top>",
        to: [email],
        subject: "Your verification code",
        html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 5 minutes.</p>`,
      }),
    });

    return c.json({ ok: true });
  } catch (err) {
    console.error("Email send error:", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

// POST /api/auth/email/verify — verify code and login
authRoutes.post("/email/verify", async (c) => {
  try {
    const { email, code } = await c.req.json<{ email: string; code: string }>();
    if (!email || !code) return c.json({ error: "Missing email or code" }, 400);

    const { JWT_SECRET } = c.env;
    const db = getDB(c);
    const now = Math.floor(Date.now() / 1000);

    const record = await db
      .prepare("SELECT * FROM email_codes WHERE email = ? AND code = ? AND expires_at > ? AND used = 0 ORDER BY id DESC LIMIT 1")
      .bind(email, code, now)
      .first<{ id: number }>();

    if (!record) return c.json({ error: "Invalid or expired code" }, 401);

    await db.prepare("UPDATE email_codes SET used = 1 WHERE id = ?").bind(record.id).run();

    const user = await findOrCreateUser(db, { email, provider: "email" });
    const token = await createToken(user, JWT_SECRET);
    setAuthCookie(c, token);

    return c.json({ ok: true });
  } catch (err) {
    console.error("Email verify error:", err);
    return c.json({ error: "Internal error" }, 500);
  }
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
