import { Hono } from "hono";
import { cors } from "hono/cors";
import type { D1Database } from "@cloudflare/workers-types";
import { authRoutes } from "./auth";
import { ideasRoutes } from "./ideas";
import { voteRoutes } from "./vote";
import { getDB, initDB } from "./db";

type Bindings = {
  DB: D1Database;
  FRONTEND_URL: string;
  SYNC_API_KEY: string;
  JWT_SECRET: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: ["https://ai-daily-pulse.top", "http://localhost:3000"],
    credentials: true,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Auto-migrate D1 tables on every request (no-op after first call)
app.use("*", async (c, next) => {
  await initDB(getDB(c));
  await next();
});

app.route("/api/auth", authRoutes);
app.route("/api", ideasRoutes);
app.route("/api", voteRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));

export default app;
