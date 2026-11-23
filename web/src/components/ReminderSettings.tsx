import { useEffect, useState } from "react";
import { DEFAULT_REMINDER_PREFS, getReminderPrefs, notificationPermission, saveReminderPrefs, type PermissionState, type ReminderPrefs } from "../native/notifications";
import { haptic } from "../native/haptics";
import { Alert } from "./ui";

/** 通知の設定（ネイティブアプリのみ表示） */
export function ReminderSettings() {
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDER_PREFS);
  const [perm, setPerm] = useState<PermissionState>("prompt");
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    void getReminderPrefs().then(setPrefs);
    void notificationPermission().then(setPerm).catch(() => setPerm("unsupported"));
  }, []);

  const update = async (patch: Partial<ReminderPrefs>) => {
    setBusy(true);
    try {
      const res = await saveReminderPrefs({ ...prefs, ...patch });
      setPrefs(res.prefs);
      setDenied(res.denied);
      setPerm(await notificationPermission());
      haptic.selection();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-3">
      <h2 className="font-bold">通知</h2>
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="font-medium">毎日の学習リマインダー</span>
          <span className="block text-xs text-slate-500">復習カードの枚数と試験までの日数をお知らせします</span>
        </span>
        <input type="checkbox" className="toggle" checked={prefs.daily} disabled={busy} onChange={(e) => void update({ daily: e.target.checked })} />
      </label>
      {prefs.daily && (
        <div className="flex items-center gap-2 pl-1">
          <span className="text-sm text-slate-600">通知する時刻</span>
          <input className="input max-w-[8rem]" type="time" value={prefs.time} disabled={busy} onChange={(e) => e.target.value && void update({ time: e.target.value })} />
        </div>
      )}
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="font-medium">手続きの期限</span>
          <span className="block text-xs text-slate-500">出願・納付などの期限と試験日を、7日前・前日・当日の朝9時にお知らせします</span>
        </span>
        <input type="checkbox" className="toggle" checked={prefs.deadlines} disabled={busy} onChange={(e) => void update({ deadlines: e.target.checked })} />
      </label>
      {(denied || perm === "denied") && <Alert kind="warn">通知が許可されていません。iPhone の「設定」→「通知」→ このアプリ から通知を許可してください。</Alert>}
    </section>
  );
}
