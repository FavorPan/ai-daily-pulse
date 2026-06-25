import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./auth";
import { ideasRoutes } from "./ideas";
import { voteRoutes } from "./vote";
import { getDB, initDB } from "./db";

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
