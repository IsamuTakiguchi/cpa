/**
 * 端末内データベース（IndexedDB / Dexie）。
 * すべての学習データの完全なコピーをここに保持し、ログイン時はサーバーと差分同期する。
 * 未ログイン（ゲスト）でもこの DB だけで全機能が動く。
 */
import Dexie, { type EntityTable } from "dexie";
import type { Attempt, CardState, StudySession, SummaryNote, TopicProgress, UserSettings } from "@cpa/shared";

export interface OutboxEntry {
  /** `${table}:${id}` */
  key: string;
  table: string;
  id: string;
  updatedAt: string;
}

export interface KV {
  key: string;
  value: string;
}

export class LocalDb extends Dexie {
  sessions!: EntityTable<StudySession, "id">;
  attempts!: EntityTable<Attempt, "id">;
  cardStates!: EntityTable<CardState, "id">;
  topicProgress!: EntityTable<TopicProgress, "id">;
  summaries!: EntityTable<SummaryNote, "id">;
  settings!: EntityTable<UserSettings, "id">;
  /** 未同期の変更（サーバーへ送る待ち行列） */
  outbox!: EntityTable<OutboxEntry, "key">;
  kv!: EntityTable<KV, "key">;

  constructor(name = "cpa-exam-app") {
    super(name);
    this.version(1).stores({
      sessions: "id, status, startedAt, updatedAt",
      attempts: "id, sessionId, questionId, topicId, subject, kind, createdAt, updatedAt",
      cardStates: "id, topicId, subject, dueAt, updatedAt",
      topicProgress: "id, subject, updatedAt",
      summaries: "id, createdAt, updatedAt",
      settings: "id",
      outbox: "key, table",
      kv: "key",
    });
  }
}

export const db = new LocalDb();

export const SYNC_TABLE_NAMES = ["sessions", "attempts", "cardStates", "topicProgress", "summaries", "settings"] as const;
export type LocalSyncTable = (typeof SYNC_TABLE_NAMES)[number];

export function tableOf(name: LocalSyncTable) {
  return db[name] as unknown as EntityTable<{ id: string; updatedAt: string; deletedAt?: string | null; deviceId: string }, "id">;
}

let cachedDeviceId: string | null = null;
export function deviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;
  let id: string | null = null;
  try {
    id = localStorage.getItem("cpa.deviceId");
    if (!id) {
      id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 36);
      localStorage.setItem("cpa.deviceId", id);
    }
  } catch {
    id = "device";
  }
  cachedDeviceId = id;
  return id;
}

export function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** レコードを保存し、同期待ち行列に載せる */
export async function putRecord<T extends { id: string; updatedAt: string; deviceId: string }>(table: LocalSyncTable, record: T): Promise<T> {
  const rec = { ...record, updatedAt: nowIso(), deviceId: deviceId() };
  await db.transaction("rw", [db[table], db.outbox], async () => {
    await tableOf(table).put(rec as never);
    await db.outbox.put({ key: `${table}:${rec.id}`, table, id: rec.id, updatedAt: rec.updatedAt });
  });
  return rec;
}

/** 論理削除 */
export async function deleteRecord(table: LocalSyncTable, id: string): Promise<void> {
  const existing = await tableOf(table).get(id);
  if (!existing) return;
  await putRecord(table, { ...existing, deletedAt: nowIso() } as never);
}

export async function kvGet(key: string): Promise<string | null> {
  return (await db.kv.get(key))?.value ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  await db.kv.put({ key, value });
}

export const DEFAULT_SETTINGS: Omit<UserSettings, "updatedAt" | "deviceId"> = {
  id: "settings",
  examDate: "2027-08-20",
  aiModel: "",
  dailyGoalMinutes: 60,
  lastExportAt: null,
  deletedAt: null,
};

export async function getSettings(): Promise<UserSettings> {
  const s = await db.settings.get("settings");
  return s ?? { ...DEFAULT_SETTINGS, updatedAt: nowIso(), deviceId: deviceId() };
}

export async function saveSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const cur = await getSettings();
  return putRecord("settings", { ...cur, ...patch, id: "settings" });
}
