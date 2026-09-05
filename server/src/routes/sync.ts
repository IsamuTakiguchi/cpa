import { and, eq, gt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { Db } from "../db";
import { syncRecords } from "../db/schema";
import type { AppEnv } from "../auth/session";
import { SYNC_TABLES, type SyncPayload, type SyncTable } from "@cpa/shared";

const recordSchema = z
  .object({
    id: z.string().min(1).max(200),
    updatedAt: z.string().datetime({ offset: true }),
    deletedAt: z.string().datetime({ offset: true }).nullable().optional(),
    deviceId: z.string().max(100).default(""),
  })
  .passthrough();

const payloadSchema = z.object(
  Object.fromEntries(SYNC_TABLES.map((t) => [t, z.array(recordSchema).max(5000).default([])])) as Record<SyncTable, z.ZodDefault<z.ZodArray<typeof recordSchema>>>,
);

const syncBody = z.object({
  deviceId: z.string().max(100),
  since: z.string().datetime({ offset: true }).nullable(),
  changes: payloadSchema,
});

export type ParsedPayload = z.infer<typeof payloadSchema>;

/** 受信レコードを LWW で upsert する。戻り値は取り込んだ件数 */
export async function upsertRecords(db: Db, userId: string, changes: ParsedPayload): Promise<number> {
  let n = 0;
  for (const table of SYNC_TABLES) {
    const rows = changes[table] ?? [];
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const values = chunk.map((r) => ({
        userId,
        tableName: table,
        id: r.id,
        data: r,
        updatedAt: new Date(r.updatedAt),
        deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
        deviceId: r.deviceId ?? "",
        serverReceivedAt: new Date(),
      }));
      await db
        .insert(syncRecords)
        .values(values)
        .onConflictDoUpdate({
          target: [syncRecords.userId, syncRecords.tableName, syncRecords.id],
          set: {
            data: sql`excluded.data`,
            updatedAt: sql`excluded.updated_at`,
            deletedAt: sql`excluded.deleted_at`,
            deviceId: sql`excluded.device_id`,
            serverReceivedAt: sql`excluded.server_received_at`,
          },
          setWhere: sql`excluded.updated_at > ${syncRecords.updatedAt}`,
        });
      n += chunk.length;
    }
  }
  return n;
}

export async function fetchChanges(db: Db, userId: string, since: Date | null): Promise<SyncPayload> {
  const where = since ? and(eq(syncRecords.userId, userId), gt(syncRecords.serverReceivedAt, since)) : eq(syncRecords.userId, userId);
  const rows = await db.select({ tableName: syncRecords.tableName, data: syncRecords.data }).from(syncRecords).where(where);
  const out: SyncPayload = { sessions: [], attempts: [], cardStates: [], topicProgress: [], summaries: [], settings: [] };
  for (const r of rows) {
    const t = r.tableName as SyncTable;
    if (t in out) (out[t] as unknown[]).push(r.data);
  }
  return out;
}

export async function deleteAllRecords(db: Db, userId: string) {
  await db.delete(syncRecords).where(eq(syncRecords.userId, userId));
}

export function syncRoutes(db: Db) {
  const app = new Hono<AppEnv>();

  app.post("/", async (c) => {
    const parsed = syncBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "同期データの形式が不正です", detail: parsed.error.issues.slice(0, 3) }, 400);
    const user = c.get("user");
    // 取り込み前の時刻を基準にすると、取り込み中に他端末から届いた変更を取り落とさない
    const serverTime = new Date();
    const since = parsed.data.since ? new Date(parsed.data.since) : null;
    await upsertRecords(db, user.id, parsed.data.changes);
    // 自端末が今送ったレコードも含めて返す（他端末側の LWW で同じ値が入るため無害。送り返しの節約のため device_id で除外）
    const changes = await fetchChanges(db, user.id, since);
    const filtered: SyncPayload = { sessions: [], attempts: [], cardStates: [], topicProgress: [], summaries: [], settings: [] };
    for (const t of SYNC_TABLES) {
      (filtered[t] as unknown[]) = (changes[t] as { deviceId?: string }[]).filter((r) => r.deviceId !== parsed.data.deviceId);
    }
    // serverTime は取り込み開始時刻より少し前に丸めて、境界の取り落としを防ぐ
    return c.json({ serverTime: new Date(serverTime.getTime() - 1000).toISOString(), changes: filtered });
  });

  return app;
}
