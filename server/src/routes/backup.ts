import { Hono } from "hono";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import type { Db } from "../db";
import type { AppEnv } from "../auth/session";
import { env } from "../env";
import { deleteAllRecords, fetchChanges, upsertRecords } from "./sync";
import { SYNC_TABLES, type ExportFile } from "@cpa/shared";
import { listSnapshots, runSnapshot, snapshotUserFile, SNAPSHOT_DB_FILE } from "../jobs/snapshot";

const recordSchema = z
  .object({
    id: z.string().min(1).max(200),
    updatedAt: z.string().datetime({ offset: true }),
    deletedAt: z.string().datetime({ offset: true }).nullable().optional(),
    deviceId: z.string().max(100).default(""),
  })
  .passthrough();

const exportSchema = z.object({
  format: z.literal("cpa-exam-app-export"),
  version: z.literal(1),
  exportedAt: z.string(),
  data: z.object(Object.fromEntries(SYNC_TABLES.map((t) => [t, z.array(recordSchema).default([])]))),
});

const importBody = z.object({
  mode: z.enum(["merge", "replace"]).default("merge"),
  file: exportSchema,
});

export async function buildExport(db: Db, userId: string): Promise<ExportFile> {
  const data = await fetchChanges(db, userId, null);
  return { format: "cpa-exam-app-export", version: 1, exportedAt: new Date().toISOString(), data };
}

async function applyImport(db: Db, userId: string, mode: "merge" | "replace", file: z.infer<typeof exportSchema>) {
  if (mode === "replace") await deleteAllRecords(db, userId);
  // replace の場合は全レコードを「今」受信したものとして入れる（LWW 条件は新規行なので常に成立）
  const count = await upsertRecords(db, userId, file.data as never);
  return count;
}

export function backupRoutes(db: Db) {
  const app = new Hono<AppEnv>();

  /** 自分の全学習データを JSON で取得 */
  app.get("/export", async (c) => {
    const user = c.get("user");
    const file = await buildExport(db, user.id);
    c.header("Content-Disposition", `attachment; filename="cpa-backup-${file.exportedAt.slice(0, 10)}.json"`);
    return c.json(file);
  });

  /** JSON を取り込む（merge: LWW で統合 / replace: 全削除してから読み込み） */
  app.post("/import", async (c) => {
    const parsed = importBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "バックアップファイルの形式が不正です", detail: parsed.error.issues.slice(0, 3) }, 400);
    const user = c.get("user");
    const count = await applyImport(db, user.id, parsed.data.mode, parsed.data.file);
    return c.json({ ok: true, count });
  });

  /** サーバー内スナップショット一覧 */
  app.get("/snapshots", async (c) => {
    const user = c.get("user");
    const list = await listSnapshots(user.id);
    return c.json({ snapshots: list, dir: env.backupDir, keep: env.backupKeep, isAdmin: user.isAdmin });
  });

  /** スナップショットを今すぐ作成 */
  app.post("/snapshots/run", async (c) => {
    const result = await runSnapshot(db, { force: true });
    return c.json(result);
  });

  /** その日のスナップショットに含まれる自分の JSON をダウンロード */
  app.get("/snapshots/:day/export", async (c) => {
    const user = c.get("user");
    const day = c.req.param("day");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return c.json({ error: "不正な日付" }, 400);
    const file = snapshotUserFile(day, user.id);
    try {
      const body = await fs.readFile(file, "utf8");
      c.header("Content-Type", "application/json");
      c.header("Content-Disposition", `attachment; filename="cpa-snapshot-${day}.json"`);
      return c.body(body);
    } catch {
      return c.json({ error: "スナップショットが見つかりません" }, 404);
    }
  });

  /** その日のスナップショットへ復元（merge / replace） */
  app.post("/snapshots/:day/restore", async (c) => {
    const user = c.get("user");
    const day = c.req.param("day");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return c.json({ error: "不正な日付" }, 400);
    const body = z.object({ mode: z.enum(["merge", "replace"]).default("merge") }).safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) return c.json({ error: "入力が不正です" }, 400);
    let file: z.infer<typeof exportSchema>;
    try {
      const raw = JSON.parse(await fs.readFile(snapshotUserFile(day, user.id), "utf8"));
      const parsed = exportSchema.safeParse(raw);
      if (!parsed.success) return c.json({ error: "スナップショットの形式が不正です" }, 500);
      file = parsed.data;
    } catch {
      return c.json({ error: "スナップショットが見つかりません" }, 404);
    }
    const count = await applyImport(db, user.id, body.data.mode, file);
    return c.json({ ok: true, count });
  });

  /** DB 全体の pg_dump（管理者のみ） */
  app.get("/snapshots/:day/db", async (c) => {
    const user = c.get("user");
    if (!user.isAdmin) return c.json({ error: "管理者のみダウンロードできます" }, 403);
    const day = c.req.param("day");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return c.json({ error: "不正な日付" }, 400);
    const file = path.join(env.backupDir, day, SNAPSHOT_DB_FILE);
    try {
      const buf = await fs.readFile(file);
      c.header("Content-Type", "application/octet-stream");
      c.header("Content-Disposition", `attachment; filename="cpa-db-${day}.dump"`);
      return c.body(buf);
    } catch {
      return c.json({ error: "この日の DB ダンプはありません（pg_dump が利用できない環境の可能性）" }, 404);
    }
  });

  return app;
}
