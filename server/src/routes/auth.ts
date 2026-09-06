import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { Db } from "../db";
import { users } from "../db/schema";
import { env } from "../env";
import { hashPassword, verifyPassword } from "../auth/password";
import { RateLimiter } from "../auth/rateLimit";
import { createSession, destroySession, resolveUser, type AppEnv } from "../auth/session";
import { googleEnabled, googleRoutes, redirectUri, type GoogleHttp } from "../auth/google";

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10, "パスワードは10文字以上にしてください").max(200),
});

const signupBody = credentials.extend({ signupCode: z.string().min(1) });

const limiter = new RateLimiter(10, 15 * 60 * 1000);

function clientKey(headers: Headers, extra: string) {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? "local";
  return `${ip}:${extra}`;
}

export function authRoutes(db: Db, googleHttp?: GoogleHttp) {
  const app = new Hono<AppEnv>();
  app.route("/google", googleRoutes(db, googleHttp));

  app.post("/signup", async (c) => {
    if (!limiter.hit(clientKey(c.req.raw.headers, "signup"))) return c.json({ error: "試行回数が多すぎます。しばらく待ってください" }, 429);
    const parsed = signupBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "入力が不正です" }, 400);
    const { email, password, signupCode } = parsed.data;
    if (signupCode !== env.signupCode) return c.json({ error: "招待コードが違います" }, 403);
    const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (exists.length) return c.json({ error: "このメールアドレスは既に登録されています" }, 409);
    const [{ count }] = (await db.select({ count: sql<number>`count(*)::int` }).from(users)) as [{ count: number }];
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(users).values({ email, passwordHash, isAdmin: count === 0 }).returning();
    await createSession(db, user!.id, c.req.header("user-agent"), c);
    return c.json({ user: { id: user!.id, email: user!.email, isAdmin: user!.isAdmin } }, 201);
  });

  app.post("/login", async (c) => {
    const parsed = credentials.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "メールアドレスまたはパスワードが違います" }, 400);
    const key = clientKey(c.req.raw.headers, parsed.data.email);
    if (!limiter.hit(key)) return c.json({ error: "試行回数が多すぎます。15分後に再試行してください" }, 429);
    const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
    const ok = user?.passwordHash ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
    if (!user || !ok) return c.json({ error: "メールアドレスまたはパスワードが違います" }, 401);
    limiter.reset(key);
    await createSession(db, user.id, c.req.header("user-agent"), c);
    return c.json({ user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
  });

  app.post("/logout", async (c) => {
    await destroySession(db, c);
    return c.json({ ok: true });
  });

  app.get("/me", async (c) => {
    const user = await resolveUser(db, c);
    return c.json({ user, aiEnabled: env.anthropicApiKey !== "", aiModel: env.aiModel, googleEnabled: googleEnabled(), googleRedirectUri: redirectUri(c) });
  });

  return app;
}
