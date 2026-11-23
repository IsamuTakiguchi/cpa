/**
 * このアプリで「無料」と「プロ版」をどう分けるか（アプリごとに書き換える部分）。
 *
 * 無料: インプット全部（要点・図解・体系マップ）、暗記カード・正誤・一問一答、カードの復習、
 *       手続きリマインド・適用基準、学習履歴、バックアップ、通知
 * プロ: 小論述・大問論述・計算問題、本試験形式、弱点補強、まとめノートの作成
 */
import type { QuestionKind, SessionConfig } from "@cpa/shared";

export const FREE_KINDS: readonly QuestionKind[] = ["card", "tf", "short"];

export function isProKind(kind: QuestionKind | string): boolean {
  return !FREE_KINDS.includes(kind as QuestionKind);
}

/** 課金画面に並べる「プロ版でできること」 */
export const PRO_BENEFITS: { icon: string; title: string; detail: string }[] = [
  { icon: "✍️", title: "小論述・大問論述", detail: "模範解答と採点ポイントで自己採点。論文式の書く力を鍛える" },
  { icon: "🧮", title: "計算問題", detail: "数値を入力して自動採点。解法の解説つき" },
  { icon: "⏱️", title: "本試験形式の通し演習", detail: "科目ごとに本試験と同じ時間・大問数で解答→一括採点" },
  { icon: "🎯", title: "弱点補強", detail: "正答率・得点率の低い問題を自動で集めて再挑戦" },
  { icon: "📝", title: "まとめノート", detail: "要点・カード・弱点・自分の答案を 1 枚にまとめて印刷・PDF 保存" },
];

/** 画面上で「どの機能から課金画面に来たか」を表示するための名前 */
export const PRO_FEATURE_LABELS: Record<string, string> = {
  exam: "本試験形式",
  weak: "弱点補強",
  essay: "論述・計算問題",
  summary: "まとめノート",
};

export type GateResult = { kind: "ok"; config: SessionConfig } | { kind: "locked"; feature: string };

/**
 * 出題設定をプロ版の有無で調整する。
 * - 本試験形式・弱点補強はプロ版のみ
 * - それ以外は無料の形式だけに絞る（無料の形式が残らなければプロ版が必要）
 */
export function gateSession(config: SessionConfig, unlocked: boolean): GateResult {
  if (unlocked) return { kind: "ok", config };
  if (config.examMode) return { kind: "locked", feature: "exam" };
  if (config.preset === "weak") return { kind: "locked", feature: "weak" };
  const kinds = config.kinds.filter((k) => !isProKind(k));
  if (kinds.length === 0) return { kind: "locked", feature: "essay" };
  return { kind: "ok", config: { ...config, kinds } };
}
