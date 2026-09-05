import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "node:fs";
import path from "node:path";
import type { Db } from "./db";
import { csrfGuard, requireAuth, type AppEnv } from "./auth/session";
import { authRoutes } from "./routes/auth";
import { syncRoutes } from "./routes/sync";
import { aiRoutes } from "./routes/ai";
import { backupRoutes } from "./routes/backup";
import { env } from "./env";

export function createApp(db: Db, opts: { serveWeb?: boolean; log?: boolean } = {}) {
  const app = new Hono<AppEnv>();
  if (opts.log) app.use(logger());
  app.use(
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
      referrerPolicy: "same-origin",
      crossOriginEmbedderPolicy: false,
    }),
  );

  const api = new Hono<AppEnv>();
  api.use("*", csrfGuard);
  api.use("*", bodyLimit({ maxSize: 20 * 1024 * 1024, onError: (c) => c.json({ error: "リクエストが大きすぎます" }, 413) }));
  api.get("/health", (c) => c.json({ ok: true, time: new Date().toISOString() }));
  api.route("/auth", authRoutes(db));
  api.use("/sync/*", requireAuth(db));
  api.use("/sync", requireAuth(db));
  api.route("/sync", syncRoutes(db));
  api.use("/ai/*", requireAuth(db));
  api.route("/ai", aiRoutes(db));
  api.use("/backup/*", requireAuth(db));
  api.route("/backup", backupRoutes(db));
  api.notFound((c) => c.json({ error: "Not found" }, 404));
  api.onError((err, c) => {
    console.error(err);
    return c.json({ error: "サーバーエラーが発生しました" }, 500);
  });
  app.route("/api", api);

  if (opts.serveWeb !== false) {
    const root = env.webDist;
    const indexPath = path.join(root, "index.html");
    if (fs.existsSync(indexPath)) {
      app.use(
        "/*",
        serveStatic({
          root,
          onFound: (p, c) => {
            if (p.includes("/assets/")) c.header("Cache-Control", "public, max-age=31536000, immutable");
            else c.header("Cache-Control", "no-cache");
          },
        }),
      );
      const indexHtml = fs.readFileSync(indexPath, "utf8");
      app.get("*", (c) => {
        if (c.req.path.startsWith("/api/")) return c.json({ error: "Not found" }, 404);
        c.header("Cache-Control", "no-cache");
        return c.html(indexHtml);
      });
    } else {
      app.get("*", (c) => c.text("web/dist が見つかりません。`npm run build` を実行してください。", 404));
    }
  }
  return app;
}
