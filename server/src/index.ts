import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { createDb } from "./db";
import { runMigrations } from "./db/migrate";
import { env } from "./env";
import { scheduleSnapshots } from "./jobs/snapshot";
import { cleanupExpiredSessions } from "./auth/session";

async function main() {
  const db = createDb(env.databaseUrl);
  await runMigrations(db);
  console.log("[db] マイグレーション完了");
  await cleanupExpiredSessions(db).catch(() => undefined);
  const app = createApp(db, { log: !env.isProd });
  scheduleSnapshots(db);
  setInterval(() => cleanupExpiredSessions(db).catch(() => undefined), 6 * 3600 * 1000);
  serve({ fetch: app.fetch, port: env.port, hostname: "0.0.0.0" }, (info) => {
    console.log(`[server] http://localhost:${info.port} で起動 (AI: ${env.anthropicApiKey ? env.aiModel : "無効"})`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
