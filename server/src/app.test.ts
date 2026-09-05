import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const TEST_DB = "cpa_test";
const base = process.env.TEST_DATABASE_URL_BASE ?? "postgres://postgres:postgres@localhost:5432";
process.env.DATABASE_URL = `${base}/${TEST_DB}`;
process.env.SESSION_SECRET = "test-secret";
process.env.SIGNUP_CODE = "invite-123";
process.env.COOKIE_SECURE = "false";
process.env.BACKUP_DIR = path.join(os.tmpdir(), `cpa-backup-test-${process.pid}`);
process.env.BACKUP_KEEP = "2";

let app: import("hono").Hono<import("./auth/session").AppEnv>;
let db: import("./db").Db;

async function resetDatabase() {
  const admin = new pg.Client({ connectionString: `${base}/postgres` });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();
}

function cookieFrom(res: Response): string {
  const raw = res.headers.get("set-cookie") ?? "";
  return raw.split(";")[0] ?? "";
}

async function json(res: Response) {
  return (await res.json()) as any;
}

const headers = (cookie?: string) => ({ "content-type": "application/json", origin: "http://localhost", host: "localhost", ...(cookie ? { cookie } : {}) });

beforeAll(async () => {
  await resetDatabase();
  const { createDb } = await import("./db");
  const { runMigrations } = await import("./db/migrate");
  const { createApp } = await import("./app");
  db = createDb(process.env.DATABASE_URL!);
  await runMigrations(db);
  app = createApp(db, { serveWeb: false });
});

afterAll(async () => {
  await fs.rm(process.env.BACKUP_DIR!, { recursive: true, force: true });
});

describe("認証", () => {
  it("招待コードが違うと登録できない", async () => {
    const res = await app.request("/api/auth/signup", { method: "POST", headers: headers(), body: JSON.stringify({ email: "a@example.com", password: "password-1234", signupCode: "wrong" }) });
    expect(res.status).toBe(403);
  });

  it("登録→me→ログアウト→ログイン", async () => {
    const res = await app.request("/api/auth/signup", { method: "POST", headers: headers(), body: JSON.stringify({ email: "A@Example.com", password: "password-1234", signupCode: "invite-123" }) });
    expect(res.status).toBe(201);
    const cookie = cookieFrom(res);
    expect(cookie.startsWith("cpa_session=")).toBe(true);
    const me = await json(await app.request("/api/auth/me", { headers: headers(cookie) }));
    expect(me.user.email).toBe("a@example.com");
    expect(me.user.isAdmin).toBe(true);

    const out = await app.request("/api/auth/logout", { method: "POST", headers: headers(cookie) });
    expect(out.status).toBe(200);
    const me2 = await json(await app.request("/api/auth/me", { headers: headers(cookie) }));
    expect(me2.user).toBeNull();

    const bad = await app.request("/api/auth/login", { method: "POST", headers: headers(), body: JSON.stringify({ email: "a@example.com", password: "wrong-password-1" }) });
    expect(bad.status).toBe(401);
    const ok = await app.request("/api/auth/login", { method: "POST", headers: headers(), body: JSON.stringify({ email: "a@example.com", password: "password-1234" }) });
    expect(ok.status).toBe(200);
  });

  it("別オリジンからの POST は拒否される", async () => {
    const res = await app.request("/api/auth/login", { method: "POST", headers: { ...headers(), origin: "https://evil.example" }, body: "{}" });
    expect(res.status).toBe(403);
  });

  it("未ログインで同期 API は 401", async () => {
    const res = await app.request("/api/sync", { method: "POST", headers: headers(), body: "{}" });
    expect(res.status).toBe(401);
  });
});

describe("同期・バックアップ", () => {
  let cookieA: string;
  let cookieB: string;
  const rec = (id: string, updatedAt: string, extra: Record<string, unknown> = {}, deviceId = "dev-1") => ({ id, updatedAt, deletedAt: null, deviceId, ...extra });

  beforeAll(async () => {
    const a = await app.request("/api/auth/login", { method: "POST", headers: headers(), body: JSON.stringify({ email: "a@example.com", password: "password-1234" }) });
    cookieA = cookieFrom(a);
    const b = await app.request("/api/auth/signup", { method: "POST", headers: headers(), body: JSON.stringify({ email: "b@example.com", password: "password-5678", signupCode: "invite-123" }) });
    cookieB = cookieFrom(b);
  });

  it("LWW で新しい updatedAt が勝ち、他端末の変更だけ返る", async () => {
    const t1 = "2026-01-01T00:00:00.000Z";
    const t2 = "2026-01-02T00:00:00.000Z";
    const r1 = await json(
      await app.request("/api/sync", {
        method: "POST",
        headers: headers(cookieA),
        body: JSON.stringify({ deviceId: "dev-1", since: null, changes: { topicProgress: [rec("fa-01", t2, { memo: "new" })], attempts: [rec("at-1", t1, { kind: "tf" })] } }),
      }),
    );
    expect(r1.changes.topicProgress).toHaveLength(0);
    expect(typeof r1.serverTime).toBe("string");

    // 端末2 が古い値を送る → 上書きされない。全件受け取る
    const r2 = await json(
      await app.request("/api/sync", {
        method: "POST",
        headers: headers(cookieA),
        body: JSON.stringify({ deviceId: "dev-2", since: null, changes: { topicProgress: [rec("fa-01", t1, { memo: "old" }, "dev-2")] } }),
      }),
    );
    expect(r2.changes.topicProgress).toHaveLength(1);
    expect(r2.changes.topicProgress[0].memo).toBe("new");
    expect(r2.changes.attempts).toHaveLength(1);

    // 端末1 が since 付きで同期 → 変更なし
    const r3 = await json(await app.request("/api/sync", { method: "POST", headers: headers(cookieA), body: JSON.stringify({ deviceId: "dev-1", since: r1.serverTime, changes: {} }) }));
    expect(r3.changes.topicProgress).toHaveLength(0);
  });

  it("他ユーザーのデータは見えない", async () => {
    const r = await json(await app.request("/api/sync", { method: "POST", headers: headers(cookieB), body: JSON.stringify({ deviceId: "x", since: null, changes: {} }) }));
    expect(r.changes.topicProgress).toHaveLength(0);
    expect(r.changes.attempts).toHaveLength(0);
  });

  it("エクスポート→replace インポートで復元できる", async () => {
    const exp = await json(await app.request("/api/backup/export", { headers: headers(cookieA) }));
    expect(exp.format).toBe("cpa-exam-app-export");
    expect(exp.data.topicProgress).toHaveLength(1);

    // 削除してから復元
    await app.request("/api/sync", {
      method: "POST",
      headers: headers(cookieA),
      body: JSON.stringify({ deviceId: "dev-1", since: null, changes: { topicProgress: [rec("fa-01", "2026-02-01T00:00:00.000Z", { memo: "deleted", deletedAt: "2026-02-01T00:00:00.000Z" })] } }),
    });
    const merged = await json(await app.request("/api/backup/import", { method: "POST", headers: headers(cookieA), body: JSON.stringify({ mode: "merge", file: exp }) }));
    expect(merged.ok).toBe(true);
    const afterMerge = await json(await app.request("/api/backup/export", { headers: headers(cookieA) }));
    expect(afterMerge.data.topicProgress[0].deletedAt).toBe("2026-02-01T00:00:00.000Z"); // merge は新しい削除が勝つ

    const replaced = await json(await app.request("/api/backup/import", { method: "POST", headers: headers(cookieA), body: JSON.stringify({ mode: "replace", file: exp }) }));
    expect(replaced.ok).toBe(true);
    const afterReplace = await json(await app.request("/api/backup/export", { headers: headers(cookieA) }));
    expect(afterReplace.data.topicProgress[0].deletedAt).toBeNull();
    expect(afterReplace.data.topicProgress[0].memo).toBe("new");
  });

  it("スナップショットの作成・一覧・復元", async () => {
    const run = await json(await app.request("/api/backup/snapshots/run", { method: "POST", headers: headers(cookieA), body: "{}" }));
    expect(run.skipped).toBe(false);
    expect(run.users).toBe(2);
    const list = await json(await app.request("/api/backup/snapshots", { headers: headers(cookieA) }));
    expect(list.snapshots).toHaveLength(1);
    expect(list.snapshots[0].hasUserExport).toBe(true);
    const day = list.snapshots[0].day;
    const file = await json(await app.request(`/api/backup/snapshots/${day}/export`, { headers: headers(cookieA) }));
    expect(file.data.topicProgress).toHaveLength(1);
    const restore = await json(await app.request(`/api/backup/snapshots/${day}/restore`, { method: "POST", headers: headers(cookieA), body: JSON.stringify({ mode: "replace" }) }));
    expect(restore.ok).toBe(true);
    // 管理者以外は DB ダンプを取れない
    const denied = await app.request(`/api/backup/snapshots/${day}/db`, { headers: headers(cookieB) });
    expect(denied.status).toBe(403);
    const adminRes = await app.request(`/api/backup/snapshots/${day}/db`, { headers: headers(cookieA) });
    expect([200, 404]).toContain(adminRes.status); // pg_dump の有無で変わる
    if (adminRes.status === 200) expect(list.snapshots[0].hasDbDump).toBe(true);
  });

  it("AI エンドポイントはキー未設定なら 503", async () => {
    const res = await app.request("/api/ai/grade-essay", { method: "POST", headers: headers(cookieA), body: JSON.stringify({ questionId: "fa-01-mini-01", answerText: "test" }) });
    expect(res.status).toBe(503);
  });
});
