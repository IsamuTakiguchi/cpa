/**
 * ローカル通知（ネイティブのみ）。サーバーは使わず、端末内で予約する。
 * - 毎日の学習リマインダー: 指定時刻に「今日の復習カード◯枚・試験まであと◯日」
 * - 手続きの期限: 出願・納付などの期限の 7 日前・前日・当日 9:00
 *
 * 予約内容はアプリを開いたとき／閉じたときに作り直す（復習カードの枚数を最新にするため）。
 * 設定は端末ごと（同期しない）なので IndexedDB の kv に保存する。
 */
import { db, getSettings, kvGet, kvSet } from "../db/local";
import { allEvents, daysFrom, formatJpDate } from "../lib/examSchedule";
import { isNative } from "./platform";

export interface ReminderPrefs {
  /** 毎日の学習リマインダー */
  daily: boolean;
  /** "HH:MM" */
  time: string;
  /** 手続きの期限の通知 */
  deadlines: boolean;
}

const PREFS_KEY = "native.reminders";
export const DEFAULT_REMINDER_PREFS: ReminderPrefs = { daily: false, time: "21:00", deadlines: false };

/** 通知 ID の範囲（このアプリが予約したものだけを消すため） */
const DAILY_BASE = 1000;
const DAILY_DAYS = 14;
const DEADLINE_BASE = 2000;
/** iOS の予約上限は 64 件。余裕を持たせる */
const MAX_DEADLINE_NOTIFICATIONS = 40;

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

export async function getReminderPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await kvGet(PREFS_KEY);
    return raw ? { ...DEFAULT_REMINDER_PREFS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) } : DEFAULT_REMINDER_PREFS;
  } catch {
    return DEFAULT_REMINDER_PREFS;
  }
}

/** プラグインは Promise の結果として返さない（billing.ts の rc() の注意を参照）ので、モジュールを返す */
function plugin() {
  return import("@capacitor/local-notifications");
}

export async function notificationPermission(): Promise<PermissionState> {
  if (!isNative()) return "unsupported";
  const p = await (await plugin()).LocalNotifications.checkPermissions();
  return p.display === "granted" ? "granted" : p.display === "denied" ? "denied" : "prompt";
}

/**
 * 通知設定を保存して予約を作り直す。
 * オンにするときは通知の許可を求め、拒否されたらオンにしない。
 */
export async function saveReminderPrefs(next: ReminderPrefs): Promise<{ prefs: ReminderPrefs; denied: boolean }> {
  let prefs = next;
  let denied = false;
  if (isNative() && (next.daily || next.deadlines)) {
    const { LocalNotifications: ln } = await plugin();
    let state = (await ln.checkPermissions()).display;
    if (state !== "granted" && state !== "denied") state = (await ln.requestPermissions()).display;
    if (state !== "granted") {
      denied = true;
      prefs = { ...next, daily: false, deadlines: false };
    }
  }
  await kvSet(PREFS_KEY, JSON.stringify(prefs));
  await rescheduleReminders();
  return { prefs, denied };
}

function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map((x) => Number(x) || 0);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h ?? 21, m ?? 0, 0, 0);
}

/** 予約済みの通知をすべて作り直す（アプリ起動時・復帰時・バックグラウンドへ移るときに呼ぶ） */
export async function rescheduleReminders(): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications: ln } = await plugin();
    const prefs = await getReminderPrefs();

    // このアプリが予約した分を取り消す
    const pending = await ln.getPending();
    const ours = pending.notifications.filter((n) => n.id >= DAILY_BASE && n.id < DEADLINE_BASE + 1000);
    if (ours.length > 0) await ln.cancel({ notifications: ours.map((n) => ({ id: n.id })) });

    if ((prefs.daily || prefs.deadlines) && (await ln.checkPermissions()).display !== "granted") return;

    const now = new Date();
    const notifications: Parameters<typeof ln.schedule>[0]["notifications"] = [];

    if (prefs.daily) {
      const settings = await getSettings();
      const cards = (await db.cardStates.toArray()).filter((c) => !c.deletedAt);
      for (let d = 0; d < DAILY_DAYS; d++) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
        const at = atTime(day, prefs.time);
        if (at.getTime() <= now.getTime() + 60_000) continue;
        const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59).getTime();
        const due = cards.filter((c) => new Date(c.dueAt).getTime() <= endOfDay).length;
        const left = daysFrom(settings.examDate, day);
        const exam = left > 0 ? `試験まであと ${left} 日。` : "";
        notifications.push({
          id: DAILY_BASE + d,
          title: due > 0 ? `復習カードが ${due} 枚あります` : "今日の学習",
          body: due > 0 ? `${exam}忘れる前に復習しましょう。` : `${exam}5分だけでも1問解いておきましょう。`,
          schedule: { at, allowWhileIdle: true },
          extra: { route: due > 0 ? "/review" : "/" },
        });
      }
    }

    if (prefs.deadlines) {
      let n = 0;
      for (const e of allEvents()) {
        if (e.kind !== "deadline" && e.kind !== "exam") continue;
        const target = new Date(`${e.endDate ?? e.date}T00:00:00`);
        for (const before of [7, 1, 0]) {
          if (n >= MAX_DEADLINE_NOTIFICATIONS) break;
          const day = new Date(target.getFullYear(), target.getMonth(), target.getDate() - before);
          const at = atTime(day, "09:00");
          if (at.getTime() <= now.getTime() + 60_000) continue;
          const when = `${formatJpDate(e.endDate ?? e.date)}${e.time ? ` ${e.time}` : ""}`;
          notifications.push({
            id: DEADLINE_BASE + n,
            title: e.kind === "exam" ? (before === 0 ? "本日は試験日です" : `試験まであと ${before} 日`) : before === 0 ? "本日が期限です" : `期限まであと ${before} 日`,
            body: `${e.title}（${when}）${e.tentative ? "※日付は予定" : ""}`,
            schedule: { at, allowWhileIdle: true },
            extra: { route: "/procedures" },
          });
          n++;
        }
      }
    }

    if (notifications.length > 0) await ln.schedule({ notifications });
  } catch (e) {
    console.warn("通知の予約に失敗しました", e);
  }
}

/** 通知をタップしたときの遷移先を受け取る */
export async function onNotificationTap(handler: (route: string) => void): Promise<() => void> {
  if (!isNative()) return () => undefined;
  const { LocalNotifications: ln } = await plugin();
  const h = await ln.addListener("localNotificationActionPerformed", (a) => {
    const route = (a.notification.extra as { route?: string } | undefined)?.route;
    if (route && route.startsWith("/")) handler(route);
  });
  return () => void h.remove();
}
