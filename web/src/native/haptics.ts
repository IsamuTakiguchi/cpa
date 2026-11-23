/**
 * ハプティクス（触覚フィードバック）。ネイティブのときだけ動き、Web 版では何もしない。
 * 呼び出し側は await 不要（失敗しても無視する）。
 */
import { isNative } from "./platform";

type HapticsModule = typeof import("@capacitor/haptics");
let mod: Promise<HapticsModule> | null = null;
function load(): Promise<HapticsModule> | null {
  if (!isNative()) return null;
  if (!mod) mod = import("@capacitor/haptics");
  return mod;
}

function run(fn: (m: HapticsModule) => Promise<void>): void {
  const p = load();
  if (!p) return;
  void p.then(fn).catch(() => undefined);
}

export const haptic = {
  /** ボタン・カード評価などの軽いタップ */
  tap: () => run((m) => m.Haptics.impact({ style: m.ImpactStyle.Light })),
  /** タブ切替・選択の変更 */
  selection: () => run((m) => m.Haptics.selectionStart().then(() => m.Haptics.selectionChanged()).then(() => m.Haptics.selectionEnd())),
  /** 正解・完了 */
  success: () => run((m) => m.Haptics.notification({ type: m.NotificationType.Success })),
  /** 部分正解・注意 */
  warning: () => run((m) => m.Haptics.notification({ type: m.NotificationType.Warning })),
  /** 不正解 */
  error: () => run((m) => m.Haptics.notification({ type: m.NotificationType.Error })),
  /** 正誤の結果に応じて */
  result: (correct: boolean) => (correct ? haptic.success() : haptic.error()),
};
