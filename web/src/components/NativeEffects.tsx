import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isNative } from "../native/platform";
import { onNotificationTap, rescheduleReminders } from "../native/notifications";

/**
 * ネイティブアプリだけで必要な常駐処理（画面には何も描かない）。
 * - 通知をタップしたら該当画面へ移動
 * - アプリを開いた／閉じたときに通知を予約し直す（復習カードの枚数を最新にする）
 */
export function NativeEffects() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNative()) return;
    let disposed = false;
    const cleanups: (() => void)[] = [];
    const keep = (fn: () => void) => (disposed ? fn() : cleanups.push(fn));

    void rescheduleReminders();
    void onNotificationTap((route) => navigate(route))
      .then(keep)
      .catch(() => undefined);
    void import("@capacitor/app")
      .then(async ({ App }) => {
        const h = await App.addListener("appStateChange", () => void rescheduleReminders());
        keep(() => void h.remove());
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, [navigate]);
  return null;
}
