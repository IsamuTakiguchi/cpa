/** 環境変数の読み取り。Railway の Variables で設定する（.env.example 参照） */
function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") throw new Error(`環境変数 ${name} が設定されていません`);
  return v;
}

const isProd = process.env.NODE_ENV === "production";

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: req("DATABASE_URL", isProd ? undefined : "postgres://postgres:postgres@localhost:5432/cpa"),
  sessionSecret: req("SESSION_SECRET", isProd ? undefined : "dev-only-session-secret-change-me"),
  signupCode: req("SIGNUP_CODE", isProd ? undefined : "dev"),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "claude-opus-5",
  aiDailyLimit: Number(process.env.AI_DAILY_LIMIT ?? 40),
  backupDir: process.env.BACKUP_DIR ?? "./data/backups",
  backupKeep: Number(process.env.BACKUP_KEEP ?? 30),
  cookieSecure: (process.env.COOKIE_SECURE ?? (isProd ? "true" : "false")) === "true",
  webDist: process.env.WEB_DIST ?? "./web/dist",
  /** セッション有効期間（日） */
  sessionDays: 30,
};

/** AI 採点に利用を許可するモデル ID */
export const ALLOWED_AI_MODELS = ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"] as const;
