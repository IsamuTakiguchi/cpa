import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Db } from "../db";
import { authSessions, users } from "../db/schema";
import { env } from "../env";

export const COOKIE_NAME = "cpa_session";

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

export type AppEnv = {
  Variables: {
    user: AuthUser;
    db: Db;
  };
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(db: Db, userId: string, userAgent: string | undefined, c: Context) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.sessionDays * 24 * 3600 * 1000);
  await db.insert(authSessions).values({ tokenHash: hashToken(token), userId, expiresAt, userAgent: userAgent?.slice(0, 200) });
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "Lax",
    path: "/",
    maxAge: env.sessionDays * 24 * 3600,
  });
}

export async function destroySession(db: Db, c: Context) {
  const token = getCookie(c, COOKIE_NAME);
  if (token) await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
  deleteCookie(c, COOKIE_NAME, { path: "/" });
}

export async function resolveUser(db: Db, c: Context): Promise<AuthUser | null> {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return null;
  const rows = await db
    .select({ id: users.id, email: users.email, isAdmin: users.isAdmin })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .where(and(eq(authSessions.tokenHash, hashToken(token)), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

/** ログイン必須ミドルウェア */
export function requireAuth(db: Db): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = await resolveUser(db, c);
    if (!user) return c.json({ error: "ログインが必要です" }, 401);
    c.set("user", user);
    await next();
  };
}

/** 同一オリジン以外からの状態変更リクエストを拒否（CSRF 対策の二重防御） */
export const csrfGuard: MiddlewareHandler = async (c, next) => {
  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
  const origin = c.req.header("origin");
  const fetchSite = c.req.header("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return c.json({ error: "不正なリクエスト元です" }, 403);
  if (origin) {
    const host = c.req.header("x-forwarded-host") ?? c.req.header("host");
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (!host || originHost !== host) return c.json({ error: "不正なリクエスト元です" }, 403);
  }
  return next();
};

export async function cleanupExpiredSessions(db: Db) {
  const { lt } = await import("drizzle-orm");
  await db.delete(authSessions).where(lt(authSessions.expiresAt, new Date()));
}
