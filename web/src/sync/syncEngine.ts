/**
 * 差分同期エンジン。
 * - 端末の未送信変更（outbox）をサーバーへ送り、前回同期以降のサーバー側変更を受け取る
 * - 受け取ったレコードは updatedAt が新しい場合のみローカルへ反映（LWW）
 * - オフライン時は失敗しても outbox に残るので、次回オンライン時に再送される
 */
import { SYNC_TABLES, type SyncPayload, type SyncTable } from "@cpa/shared";
import { api, ApiError } from "../api/client";
import { db, deviceId, kvGet, kvSet, tableOf, type LocalSyncTable } from "../db/local";

export type SyncStatus = "idle" | "syncing" | "offline" | "error" | "unauthenticated";

type Listener = (s: SyncState) => void;

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  pending: number;
  error: string | null;
}

const LAST_SYNC_KEY = "sync.lastServerTime";

class SyncEngine {
  private state: SyncState = { status: "idle", lastSyncAt: null, pending: 0, error: null };
  private listeners = new Set<Listener>();
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private enabled = false;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  getState() {
    return this.state;
  }

  private set(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l(this.state);
  }

  async init() {
    const last = await kvGet(LAST_SYNC_KEY);
    const pending = await db.outbox.count();
    this.set({ lastSyncAt: last, pending });
  }

  /** ログイン状態になったら有効化。定期同期＋オンライン復帰時同期 */
  enable() {
    if (this.enabled) return;
    this.enabled = true;
    window.addEventListener("online", this.onOnline);
    document.addEventListener("visibilitychange", this.onVisible);
    this.schedule(500);
  }

  disable() {
    this.enabled = false;
    window.removeEventListener("online", this.onOnline);
    document.removeEventListener("visibilitychange", this.onVisible);
    if (this.timer) clearTimeout(this.timer);
    this.set({ status: "unauthenticated" });
  }

  private onOnline = () => this.schedule(300);
  private onVisible = () => {
    if (document.visibilityState === "visible") this.schedule(300);
  };

  /** 変更があったときに呼ぶ（デバウンスして送信） */
  schedule(delayMs = 2000) {
    if (!this.enabled) {
      db.outbox.count().then((pending) => this.set({ pending }));
      return;
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.syncNow(), delayMs);
  }

  async syncNow(): Promise<boolean> {
    if (!this.enabled || this.running) return false;
    this.running = true;
    this.set({ status: "syncing", error: null });
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        this.set({ status: "offline", pending: await db.outbox.count() });
        return false;
      }
      const outbox = await db.outbox.toArray();
      const changes = emptyPayload();
      for (const e of outbox) {
        const rec = await tableOf(e.table as LocalSyncTable).get(e.id);
        if (rec) (changes[e.table as SyncTable] as unknown[]).push(rec);
      }
      const since = await kvGet(LAST_SYNC_KEY);
      const res = await api.sync({ deviceId: deviceId(), since, changes });
      await this.applyRemote(res.changes);
      // 送信済みの outbox を削除（送信中に更新されたものは残す）
      await db.transaction("rw", db.outbox, async () => {
        for (const e of outbox) {
          const cur = await db.outbox.get(e.key);
          if (cur && cur.updatedAt === e.updatedAt) await db.outbox.delete(e.key);
        }
      });
      await kvSet(LAST_SYNC_KEY, res.serverTime);
      this.set({ status: "idle", lastSyncAt: res.serverTime, pending: await db.outbox.count(), error: null });
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) this.set({ status: "unauthenticated", error: null });
      else if (e instanceof TypeError) this.set({ status: "offline", error: null });
      else this.set({ status: "error", error: (e as Error).message });
      this.set({ pending: await db.outbox.count() });
      return false;
    } finally {
      this.running = false;
    }
  }

  /** サーバーから受け取った変更をローカルへ LWW で反映 */
  async applyRemote(changes: SyncPayload) {
    const tables = SYNC_TABLES.filter((t) => (changes[t] as unknown[]).length > 0);
    if (tables.length === 0) return;
    await db.transaction(
      "rw",
      tables.map((t) => db[t as LocalSyncTable]),
      async () => {
        for (const t of tables) {
          const table = tableOf(t as LocalSyncTable);
          for (const rec of changes[t] as { id: string; updatedAt: string }[]) {
            const cur = await table.get(rec.id);
            if (!cur || cur.updatedAt < rec.updatedAt) await table.put(rec as never);
          }
        }
      },
    );
  }

  /** ログイン直後: ローカルの全データを outbox に載せて次回同期で送る（ゲスト→ログインの取り込み） */
  async enqueueAll() {
    await kvSet(LAST_SYNC_KEY, "");
    await db.transaction("rw", [...SYNC_TABLES.map((t) => db[t as LocalSyncTable]), db.outbox], async () => {
      for (const t of SYNC_TABLES) {
        const rows = await tableOf(t as LocalSyncTable).toArray();
        for (const r of rows) await db.outbox.put({ key: `${t}:${r.id}`, table: t, id: r.id, updatedAt: r.updatedAt });
      }
    });
    await db.kv.delete(LAST_SYNC_KEY);
    this.set({ pending: await db.outbox.count() });
  }

  /** ログアウト時などにサーバー同期の基準時刻をリセット */
  async resetCursor() {
    await db.kv.delete(LAST_SYNC_KEY);
    this.set({ lastSyncAt: null });
  }
}

function emptyPayload(): SyncPayload {
  return { sessions: [], attempts: [], cardStates: [], topicProgress: [], summaries: [], settings: [] };
}

export const syncEngine = new SyncEngine();
