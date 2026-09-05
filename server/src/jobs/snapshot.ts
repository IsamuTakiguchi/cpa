import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Db } from "../db";
import { users } from "../db/schema";
import { env } from "../env";
import { fetchChanges } from "../routes/sync";

const execFileP = promisify(execFile);

export const SNAPSHOT_DB_FILE = "db.dump";

export interface SnapshotInfo {
  day: string;
  createdAt: string;
  hasDbDump: boolean;
  dbDumpBytes: number;
  hasUserExport: boolean;
  userExportBytes: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function snapshotUserFile(day: string, userId: string): string {
  return path.join(env.backupDir, day, `user-${userId}.json`);
}

/**
 * 日次スナップショット。
 * 1. DB 全体を pg_dump（カスタム形式）— pg_dump が無い環境ではスキップ
 * 2. ユーザーごとの学習データを JSON で保存（アプリの「復元」で使う）
 * 3. BACKUP_KEEP 世代を超えた古い日付フォルダを削除
 */
export async function runSnapshot(db: Db, opts: { force?: boolean } = {}): Promise<{ day: string; dbDump: boolean; users: number; skipped: boolean }> {
  const day = today();
  const dir = path.join(env.backupDir, day);
  const marker = path.join(dir, ".complete");
  if (!opts.force) {
    try {
      await fs.access(marker);
      return { day, dbDump: false, users: 0, skipped: true };
    } catch {
      /* not yet */
    }
  }
  await fs.mkdir(dir, { recursive: true });

  let dbDump = false;
  try {
    await execFileP("pg_dump", ["-Fc", "-f", path.join(dir, SNAPSHOT_DB_FILE), env.databaseUrl], { timeout: 10 * 60 * 1000 });
    dbDump = true;
  } catch (e) {
    console.warn("[snapshot] pg_dump をスキップ:", (e as Error).message.split("\n")[0]);
  }

  const allUsers = await db.select({ id: users.id }).from(users);
  for (const u of allUsers) {
    const data = await fetchChanges(db, u.id, null);
    const file = { format: "cpa-exam-app-export", version: 1, exportedAt: new Date().toISOString(), data };
    await fs.writeFile(snapshotUserFile(day, u.id), JSON.stringify(file));
  }
  await fs.writeFile(marker, new Date().toISOString());
  await rotate();
  console.log(`[snapshot] ${day} 完了 (pg_dump=${dbDump}, users=${allUsers.length})`);
  return { day, dbDump, users: allUsers.length, skipped: false };
}

async function rotate() {
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(env.backupDir)).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort();
  } catch {
    return;
  }
  const excess = entries.length - env.backupKeep;
  for (let i = 0; i < excess; i++) {
    await fs.rm(path.join(env.backupDir, entries[i]!), { recursive: true, force: true });
  }
}

export async function listSnapshots(userId: string): Promise<SnapshotInfo[]> {
  let entries: string[] = [];
  try {
    entries = (await fs.readdir(env.backupDir)).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort().reverse();
  } catch {
    return [];
  }
  const out: SnapshotInfo[] = [];
  for (const day of entries) {
    const dir = path.join(env.backupDir, day);
    const stat = async (f: string) => {
      try {
        const s = await fs.stat(path.join(dir, f));
        return s.size;
      } catch {
        return -1;
      }
    };
    const dbBytes = await stat(SNAPSHOT_DB_FILE);
    const userBytes = await stat(`user-${userId}.json`);
    let createdAt = day;
    try {
      createdAt = (await fs.readFile(path.join(dir, ".complete"), "utf8")).trim();
    } catch {
      /* incomplete */
    }
    out.push({ day, createdAt, hasDbDump: dbBytes >= 0, dbDumpBytes: Math.max(dbBytes, 0), hasUserExport: userBytes >= 0, userExportBytes: Math.max(userBytes, 0) });
  }
  return out;
}

/** 1時間ごとに「今日のスナップショットが無ければ作る」 */
export function scheduleSnapshots(db: Db) {
  const tick = () => runSnapshot(db).catch((e) => console.error("[snapshot] 失敗:", e));
  setTimeout(tick, 30 * 1000);
  setInterval(tick, 60 * 60 * 1000);
}
