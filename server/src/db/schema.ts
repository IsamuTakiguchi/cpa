import { sql } from "drizzle-orm";
import { boolean, date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  /** Google ログインのみのユーザーは null */
  passwordHash: text("password_hash"),
  /** Google アカウントの subject（sub）。Google ログインで紐付く */
  googleSub: text("google_sub").unique(),
  /** 最初に登録したユーザー。DB全体のダンプをダウンロードできる */
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    /** セッショントークンの SHA-256 */
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
  },
  (t) => [index("auth_sessions_user_idx").on(t.userId)],
);

/**
 * 学習データの同期レコード。テーブル名（sessions / attempts / cardStates / topicProgress / summaries / settings）
 * と id ごとに 1 行。本文は jsonb。Last-Write-Wins（updated_at が新しい方を採用）。
 * 差分取得は server_received_at（サーバー時刻）基準で行い、端末の時計ずれの影響を受けない。
 */
export const syncRecords = pgTable(
  "sync_records",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tableName: text("table_name").notNull(),
    id: text("id").notNull(),
    data: jsonb("data").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deviceId: text("device_id").notNull().default(""),
    serverReceivedAt: timestamp("server_received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.tableName, t.id] }),
    index("sync_records_user_received_idx").on(t.userId, t.serverReceivedAt),
  ],
);

export const aiUsage = pgTable(
  "ai_usage",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);
