import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "./index";

/** 起動時にマイグレーションを適用する。migrations フォルダは server/drizzle */
export async function runMigrations(db: Db) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // 開発時: server/src/db → ../../drizzle、ビルド後: server/dist → ../drizzle
  const candidates = [path.resolve(here, "../../drizzle"), path.resolve(here, "../drizzle"), path.resolve(process.cwd(), "server/drizzle")];
  const { existsSync } = await import("node:fs");
  const folder = candidates.find((c) => existsSync(c));
  if (!folder) throw new Error("マイグレーションフォルダが見つかりません: " + candidates.join(", "));
  await migrate(db, { migrationsFolder: folder });
}
