/**
 * Google ログイン（OAuth 2.0 / OpenID Connect 認可コードフロー）
 *
 *   GET /api/auth/google           → Google の同意画面へリダイレクト（state を Cookie に保存）
 *   GET /api/auth/google/callback  → code をトークンに交換し、id_token を Google の tokeninfo で検証してログイン
 *
 * アカウント作成の規則:
 *   - 同じメールアドレスのユーザーが既にいれば、そのアカウントにログイン（Google と紐付け）
 *   - まだユーザーが 1 人もいなければ、最初のユーザー（管理者）として作成
 *   - それ以外は ALLOWED_EMAILS に含まれるメールアドレスのみ作成可（第三者の登録を防ぐ）
 */
import { createHash, randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Db } from "../db";
import { users } from "../db/schema";
import { env } from "../env";
import { createSession, type AppEnv } from "./session";

const STATE_COOKIE = "cpa_oauth_state";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

export function googleEnabled(): boolean {
  return env.googleClientId !== "" && env.googleClientSecret !== "";
}

export function publicOrigin(c: Context): string {
  if (env.publicUrl) return env.publicUrl;
  const proto = c.req.header("x-forwarded-proto") ?? (env.cookieSecure ? "https" : "http");
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? "localhost";
  return `${proto}://${host}`;
}

export function redirectUri(c: Context): string {
  return `${publicOrigin(c)}/api/auth/google/callback`;
}

function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

interface TokenInfo {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  exp?: string;
}

/** テストで差し替えられるように HTTP 呼び出しを注入可能にする */
export interface GoogleHttp {
  exchangeCode: (params: URLSearchParams) => Promise<{ id_token?: string; error?: string; error_description?: string }>;
  tokenInfo: (idToken: string) => Promise<TokenInfo>;
}

export const defaultGoogleHttp: GoogleHttp = {
  async exchangeCode(params) {
    const res = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: params });
    return (await res.json()) as { id_token?: string; error?: string; error_description?: string };
  },
  async tokenInfo(idToken) {
    const res = await fetch(`${TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);
    return (await res.json()) as TokenInfo;
  },
};

function failRedirect(c: Context, message: string) {
  return c.redirect(`/auth?error=${encodeURIComponent(message)}`, 302);
}

export function googleRoutes(db: Db, http: GoogleHttp = defaultGoogleHttp) {
  const app = new Hono<AppEnv>();

  app.get("/", (c) => {
    if (!googleEnabled()) return c.json({ error: "Google ログインはサーバーで設定されていません（GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET）" }, 503);
    const state = randomBytes(24).toString("base64url");
    setCookie(c, STATE_COOKIE, state, { httpOnly: true, secure: env.cookieSecure, sameSite: "Lax", path: "/api/auth/google", maxAge: 600 });
    const params = new URLSearchParams({
      client_id: env.googleClientId,
      redirect_uri: redirectUri(c),
      response_type: "code",
      scope: "openid email",
      state: hash(state),
      prompt: "select_account",
    });
    return c.redirect(`${AUTH_URL}?${params.toString()}`, 302);
  });

  app.get("/callback", async (c) => {
    if (!googleEnabled()) return failRedirect(c, "Google ログインは設定されていません");
    const stateCookie = getCookie(c, STATE_COOKIE);
    deleteCookie(c, STATE_COOKIE, { path: "/api/auth/google" });
    const state = c.req.query("state");
    const code = c.req.query("code");
    const err = c.req.query("error");
    if (err) return failRedirect(c, `Google ログインがキャンセルされました（${err}）`);
    if (!stateCookie || !state || hash(stateCookie) !== state) return failRedirect(c, "ログイン要求の照合に失敗しました。もう一度お試しください");
    if (!code) return failRedirect(c, "認可コードがありません");

    let idToken: string | undefined;
    try {
      const token = await http.exchangeCode(
        new URLSearchParams({ code, client_id: env.googleClientId, client_secret: env.googleClientSecret, redirect_uri: redirectUri(c), grant_type: "authorization_code" }),
      );
      if (token.error || !token.id_token) return failRedirect(c, `Google からトークンを取得できませんでした（${token.error_description ?? token.error ?? "id_token なし"}）`);
      idToken = token.id_token;
    } catch (e) {
      return failRedirect(c, "Google との通信に失敗しました: " + (e as Error).message);
    }

    let info: TokenInfo;
    try {
      info = await http.tokenInfo(idToken);
    } catch (e) {
      return failRedirect(c, "トークンの検証に失敗しました: " + (e as Error).message);
    }
    const emailVerified = info.email_verified === true || info.email_verified === "true";
    if (info.aud !== env.googleClientId || !info.sub || !info.email || !emailVerified) return failRedirect(c, "Google アカウント情報を検証できませんでした");
    const email = info.email.toLowerCase();

    const [bySub] = await db.select().from(users).where(eq(users.googleSub, info.sub)).limit(1);
    let user = bySub;
    if (!user) {
      const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (byEmail) {
        await db.update(users).set({ googleSub: info.sub }).where(eq(users.id, byEmail.id));
        user = { ...byEmail, googleSub: info.sub };
      } else {
        const [{ count }] = (await db.select({ count: sql<number>`count(*)::int` }).from(users)) as [{ count: number }];
        const allowed = count === 0 || env.allowedEmails.includes(email);
        if (!allowed) return failRedirect(c, `このメールアドレス（${email}）は登録を許可されていません。サーバーの ALLOWED_EMAILS に追加するか、招待コードで登録してください`);
        const [created] = await db.insert(users).values({ email, passwordHash: null, googleSub: info.sub, isAdmin: count === 0 }).returning();
        user = created!;
      }
    }
    await createSession(db, user.id, c.req.header("user-agent"), c);
    return c.redirect("/?login=google", 302);
  });

  return app;
}
