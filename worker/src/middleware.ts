import type { Context, Next } from "hono";
import { SignJWT, jwtVerify } from "jose";
import type { UserRow } from "./db";

export interface AuthUser {
  sub: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
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
    avatar_url: user.avatar_url,
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

export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
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

export async function optionalAuth(c: Context, next: Next): Promise<Response | void> {
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
