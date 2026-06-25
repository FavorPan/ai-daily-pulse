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
