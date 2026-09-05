import type { Attempt } from "@cpa/shared";

export interface AnswerResult {
  answer: unknown;
  isCorrect: boolean | null;
  selfScore: number | null;
  selfChecks: Attempt["selfChecks"];
  maxScore: number | null;
  aiFeedback: Attempt["aiFeedback"];
}

/**
 * full: 解答→採点→次へ を1コンポーネントで（通常演習）
 * answer: 解答入力のみ（本試験形式の解答フェーズ。下書きを onDraft で保存）
 * grade: 与えられた解答を採点するところから開始（本試験形式の採点フェーズ）
 */
export type QuestionPhase = "full" | "answer" | "grade";

export interface QuestionProps<Q> {
  q: Q;
  phase?: QuestionPhase;
  initialAnswer?: unknown;
  onDraft?: (answer: unknown) => void;
  onDone: (result: AnswerResult) => void;
  /** AI 採点に使うモデル（設定） */
  aiModel?: string;
}
