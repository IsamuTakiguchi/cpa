import { beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

const TEST_DB = "cpa_test_google";
const base = process.env.TEST_DATABASE_URL_BASE ?? "postgres://postgres:postgres@localhost:5432";
process.env.DATABASE_URL = `${base}/${TEST_DB}`;
process.env.SESSION_SECRET = "test-secret";
process.env.SIGNUP_CODE = "invite-123";
process.env.COOKIE_SECURE = "false";
process.env.GOOGLE_CLIENT_ID = "client-id-123";
process.env.GOOGLE_CLIENT_SECRET = "client-secret";
process.env.ALLOWED_EMAILS = "friend@example.com";
process.env.PUBLIC_URL = "https://app.example.com";

let app: import("hono").Hono<import("./session").AppEnv>;

const accounts = new Map<string, { sub: string; email: string; verified: boolean }>([
  ["code-owner", { sub: "sub-owner", email: "Owner@Gmail.com", verified: true }],
  ["code-friend", { sub: "sub-friend", email: "friend@example.com", verified: true }],
  ["code-stranger", { sub: "sub-stranger", email: "stranger@example.com", verified: true }],
  ["code-unverified", { sub: "sub-unv", email: "unv@example.com", verified: false }],
]);

const fakeHttp: import("./google").GoogleHttp = {
  async exchangeCode(params) {
    const code = params.get("code")!;
    expect(params.get("redirect_uri")).toBe("https://app.example.com/api/auth/google/callback");
    return accounts.has(code) ? { id_token: `tok:${code}` } : { error: "invalid_grant" };
  },
  async tokenInfo(idToken) {
    const a = accounts.get(idToken.replace("tok:", ""))!;
    return { aud: "client-id-123", sub: a.sub, email: a.email, email_verified: a.verified ? "true" : "false" };
  },
};

function cookies(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""]) {
    const [kv] = line.split(";");
    const [k, v] = (kv ?? "").split("=");
    if (k) out[k] = v ?? "";
  }
  return out;
}

async function startLogin() {
  const res = await app.request("/api/auth/google", { headers: { host: "app.example.com" } });
  expect(res.status).toBe(302);
  const location = res.headers.get("location")!;
  const state = new URL(location).searchParams.get("state")!;
  const stateCookie = cookies(res)["cpa_oauth_state"]!;
  return { location, state, stateCookie };
}

async function callback(code: string, state: string, stateCookie: string) {
  return app.request(`/api/auth/google/callback?code=${code}&state=${state}`, { headers: { host: "app.example.com", cookie: `cpa_oauth_state=${stateCookie}` } });
}

beforeAll(async () => {
  const admin = new pg.Client({ connectionString: `${base}/postgres` });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();
  const { createDb } = await import("../db");
  const { runMigrations } = await import("../db/migrate");
  const { createApp } = await import("../app");
  const db = createDb(process.env.DATABASE_URL!);
  await runMigrations(db);
  app = createApp(db, { serveWeb: false, googleHttp: fakeHttp });
});

describe("Google ログイン", () => {
  it("me が googleEnabled とリダイレクト URI を返す", async () => {
    const me = (await (await app.request("/api/auth/me", { headers: { host: "app.example.com" } })).json()) as any;
    expect(me.googleEnabled).toBe(true);
    expect(me.googleRedirectUri).toBe("https://app.example.com/api/auth/google/callback");
  });

  it("Google の同意画面へリダイレクトし state を Cookie に保存する", async () => {
    const { location, state, stateCookie } = await startLogin();
    expect(location.startsWith("https://accounts.google.com/o/oauth2/v2/auth?")).toBe(true);
    expect(location).toContain("client_id=client-id-123");
    expect(location).toContain(encodeURIComponent("https://app.example.com/api/auth/google/callback"));
    expect(state).toHaveLength(64);
    expect(stateCookie.length).toBeGreaterThan(10);
  });

  it("state が一致しないと拒否する", async () => {
    const { state } = await startLogin();
    const res = await callback("code-owner", state, "wrong-cookie");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/auth?error=");
  });

  it("最初のユーザーは管理者として作成されログインできる", async () => {
    const { state, stateCookie } = await startLogin();
    const res = await callback("code-owner", state, stateCookie);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/?login=google");
    const session = cookies(res)["cpa_session"];
    expect(session).toBeTruthy();
    const me = (await (await app.request("/api/auth/me", { headers: { host: "app.example.com", cookie: `cpa_session=${session}` } })).json()) as any;
    expect(me.user.email).toBe("owner@gmail.com");
    expect(me.user.isAdmin).toBe(true);
  });

  it("許可リストにないメールアドレスは作成されない", async () => {
    const { state, stateCookie } = await startLogin();
    const res = await callback("code-stranger", state, stateCookie);
    expect(res.headers.get("location")).toContain(encodeURIComponent("登録を許可されていません"));
    expect(cookies(res)["cpa_session"]).toBeUndefined();
  });

  it("許可リストのメールアドレスは作成される（管理者ではない）", async () => {
    const { state, stateCookie } = await startLogin();
    const res = await callback("code-friend", state, stateCookie);
    expect(res.headers.get("location")).toBe("/?login=google");
    const session = cookies(res)["cpa_session"]!;
    const me = (await (await app.request("/api/auth/me", { headers: { host: "app.example.com", cookie: `cpa_session=${session}` } })).json()) as any;
    expect(me.user.isAdmin).toBe(false);
  });

  it("メール未確認のアカウントは拒否する", async () => {
    const { state, stateCookie } = await startLogin();
    const res = await callback("code-unverified", state, stateCookie);
    expect(res.headers.get("location")).toContain("/auth?error=");
  });

  it("既存のメール/パスワード登録ユーザーは同じメールの Google で紐付いてログインできる", async () => {
    const signup = await app.request("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json", origin: "https://app.example.com", host: "app.example.com" }, body: JSON.stringify({ email: "pw@example.com", password: "password-1234", signupCode: "invite-123" }) });
    expect(signup.status).toBe(201);
    accounts.set("code-pw", { sub: "sub-pw", email: "pw@example.com", verified: true });
    const { state, stateCookie } = await startLogin();
    const res = await callback("code-pw", state, stateCookie);
    expect(res.headers.get("location")).toBe("/?login=google");
    // パスワードログインも引き続き可能
    const login = await app.request("/api/auth/login", { method: "POST", headers: { "content-type": "application/json", origin: "https://app.example.com", host: "app.example.com" }, body: JSON.stringify({ email: "pw@example.com", password: "password-1234" }) });
    expect(login.status).toBe(200);
  });

  it("Google のみのユーザーはパスワードログインできない", async () => {
    const login = await app.request("/api/auth/login", { method: "POST", headers: { "content-type": "application/json", origin: "https://app.example.com", host: "app.example.com" }, body: JSON.stringify({ email: "owner@gmail.com", password: "anything-1234" }) });
    expect(login.status).toBe(401);
  });
});
