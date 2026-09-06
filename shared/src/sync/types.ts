/**
 * フロント（IndexedDB）とサーバー（Postgres）で共有する学習データの型。
 * 同期は Last-Write-Wins（updatedAt が新しい方を採用）。削除は deletedAt を立てる論理削除。
 */

export interface SyncMeta {
  /** ISO 8601 */
  updatedAt: string;
  deletedAt?: string | null;
  deviceId: string;
}

export type StudySessionStatus = "in_progress" | "completed" | "abandoned";

export type OrderMode = "topic" | "random" | "weak";

export interface SessionConfig {
  /** プリセット名（カスタムなら "custom"） */
  preset: string;
  title: string;
  subjects: string[];
  topicIds: string[];
  kinds: string[];
  /** 問題数上限（0 = 制限なし。時間で決める） */
  maxQuestions: number;
  /** 制限時間（分、0 = なし） */
  timeLimitMinutes: number;
  order: OrderMode;
  preferUnseen: boolean;
  /** 本試験形式: 大問を通しで解答し一括提出 */
  examMode: boolean;
}

export interface StudySession extends SyncMeta {
  id: string;
  config: SessionConfig;
  status: StudySessionStatus;
  questionIds: string[];
  currentIndex: number;
  startedAt: string;
  endedAt?: string | null;
  /** 経過秒（中断・再開を跨いで累積） */
  elapsedSec: number;
  /** 解答途中の下書き（question id → 解答内容）。本試験形式の一括提出や中断・再開に使う */
  drafts?: Record<string, unknown>;
  /** 問題ごとの所要秒 */
  perQuestionSec?: Record<string, number>;
  result?: SessionResult | null;
}

export interface SessionResult {
  total: number;
  answered: number;
  correct: number;
  /** 論述の合計得点／満点 */
  score: number;
  maxScore: number;
  perKind: Record<string, { count: number; correct: number; score: number; maxScore: number }>;
  perQuestionSec: Record<string, number>;
}

export interface AiPointResult {
  text: string;
  score: number;
  maxScore: number;
  comment: string;
}

export interface AiFeedback {
  model: string;
  score: number;
  maxScore: number;
  pointResults: AiPointResult[];
  feedback: string;
  improvedAnswer: string;
  gradedAt: string;
}

export interface Attempt extends SyncMeta {
  id: string;
  sessionId: string | null;
  questionId: string;
  kind: string;
  topicId: string;
  subject: string;
  /** 種別ごとの解答内容（card: rating, tf: boolean, short: text, mini/essay: text or {sub: text}, calc: numbers） */
  answer: unknown;
  isCorrect: boolean | null;
  /** 自己採点（チェックした採点ポイントの合計） */
  selfScore: number | null;
  /** 自己採点でチェックしたポイントのインデックス（大問論述は枝問ラベルごと） */
  selfChecks: number[] | Record<string, number[]> | null;
  maxScore: number | null;
  /** AI 採点結果（大問論述は枝問ラベルごと） */
  aiFeedback: AiFeedback | Record<string, AiFeedback> | null;
  elapsedSec: number;
  createdAt: string;
}

export interface CardState extends SyncMeta {
  /** card id をそのままキーにする */
  id: string;
  topicId: string;
  subject: string;
  ease: number;
  intervalDays: number;
  dueAt: string;
  reps: number;
  lapses: number;
  lastReviewedAt: string | null;
}

export interface TopicProgress extends SyncMeta {
  /** topic id */
  id: string;
  subject: string;
  noteReadAt: string | null;
  /** 0: 未着手, 1: 一読, 2: 演習中, 3: 仕上がり */
  mastery: number;
  memo: string;
  bookmarked: boolean;
}

export interface SummaryScope {
  subjects: string[];
  topicIds: string[];
  includeNotes: "full" | "summary" | "none";
  includeCards: boolean;
  includeWeakQuestions: boolean;
  includeMyAnswers: boolean;
  includeMemos: boolean;
}

export interface SummaryNote extends SyncMeta {
  id: string;
  title: string;
  scope: SummaryScope;
  bodyMarkdown: string;
  aiNotes: string | null;
  createdAt: string;
}

export interface UserSettings extends SyncMeta {
  /** 常に "settings" */
  id: string;
  examDate: string;
  aiModel: string;
  dailyGoalMinutes: number;
  lastExportAt: string | null;
  /** 受験区分（手続きリマインドの対象を決める）。未設定なら全期限を表示 */
  examTrack?: "tanto1" | "tanto2" | "exempt" | "";
  /** 手続きチェックリストの完了状態（item id → 完了日時 ISO） */
  procedureChecks?: Record<string, string>;
}

export interface SyncPayload {
  sessions: StudySession[];
  attempts: Attempt[];
  cardStates: CardState[];
  topicProgress: TopicProgress[];
  summaries: SummaryNote[];
  settings: UserSettings[];
}

export const EMPTY_SYNC_PAYLOAD: SyncPayload = {
  sessions: [],
  attempts: [],
  cardStates: [],
  topicProgress: [],
  summaries: [],
  settings: [],
};

export type SyncTable = keyof SyncPayload;
export const SYNC_TABLES: SyncTable[] = ["sessions", "attempts", "cardStates", "topicProgress", "summaries", "settings"];

export interface SyncRequest {
  deviceId: string;
  /** 前回同期時刻（ISO）。未同期なら null */
  since: string | null;
  changes: SyncPayload;
}

export interface SyncResponse {
  serverTime: string;
  changes: SyncPayload;
}

/** アプリ内エクスポートのファイル形式 */
export interface ExportFile {
  format: "cpa-exam-app-export";
  version: 1;
  exportedAt: string;
  data: SyncPayload;
}

/** aiFeedback / selfChecks は小論述なら単一、大問論述なら枝問ラベルごとのマップ */
export function isSingleFeedback(x: Attempt["aiFeedback"]): x is AiFeedback {
  return !!x && typeof (x as AiFeedback).score === "number" && Array.isArray((x as AiFeedback).pointResults);
}
export function feedbackMap(x: Attempt["aiFeedback"]): Record<string, AiFeedback> {
  return x && !isSingleFeedback(x) ? (x as Record<string, AiFeedback>) : {};
}
export function checksMap(x: Attempt["selfChecks"]): Record<string, number[]> {
  return x && !Array.isArray(x) ? x : {};
}
