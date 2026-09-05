/** 学習データの高レベル操作（ローカルDBに書き、同期エンジンに通知） */
import type { AiFeedback, Attempt, CardState, ExportFile, QuestionKind, SessionConfig, SessionResult, StudySession, SummaryNote, SummaryScope, TopicProgress } from "@cpa/shared";
import { feedbackMap, getQuestionRef, isSingleFeedback, SYNC_TABLES } from "@cpa/shared";
import { db, deleteRecord, deviceId, newId, nowIso, putRecord, saveSettings, tableOf, type LocalSyncTable } from "../db/local";
import { syncEngine } from "../sync/syncEngine";
import { newCardState, review, type Rating } from "./srs";

function touch() {
  syncEngine.schedule();
}

export async function createSession(config: SessionConfig, questionIds: string[]): Promise<StudySession> {
  const s: StudySession = {
    id: newId(),
    config,
    status: "in_progress",
    questionIds,
    currentIndex: 0,
    startedAt: nowIso(),
    endedAt: null,
    elapsedSec: 0,
    drafts: {},
    perQuestionSec: {},
    result: null,
    updatedAt: nowIso(),
    deletedAt: null,
    deviceId: deviceId(),
  };
  await putRecord("sessions", s);
  touch();
  return s;
}

export async function updateSession(s: StudySession, patch: Partial<StudySession>): Promise<StudySession> {
  const next = await putRecord("sessions", { ...s, ...patch });
  touch();
  return next;
}

export async function abandonSession(s: StudySession) {
  await updateSession(s, { status: "abandoned", endedAt: nowIso() });
}

export async function deleteSession(id: string) {
  await deleteRecord("sessions", id);
  touch();
}

export interface AttemptInput {
  sessionId: string | null;
  questionId: string;
  answer: unknown;
  isCorrect: boolean | null;
  selfScore: number | null;
  selfChecks: Attempt["selfChecks"];
  maxScore: number | null;
  aiFeedback: Attempt["aiFeedback"];
  elapsedSec: number;
}

export async function saveAttempt(input: AttemptInput): Promise<Attempt> {
  const ref = getQuestionRef(input.questionId);
  const a: Attempt = {
    id: newId(),
    sessionId: input.sessionId,
    questionId: input.questionId,
    kind: ref?.kind ?? "unknown",
    topicId: ref?.topicId ?? "",
    subject: ref?.subject ?? "",
    answer: input.answer,
    isCorrect: input.isCorrect,
    selfScore: input.selfScore,
    selfChecks: input.selfChecks,
    maxScore: input.maxScore,
    aiFeedback: input.aiFeedback,
    elapsedSec: input.elapsedSec,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    deviceId: deviceId(),
  };
  await putRecord("attempts", a);
  await bumpTopicMastery(a.topicId, a.subject);
  touch();
  return a;
}

export async function updateAttempt(a: Attempt, patch: Partial<Attempt>): Promise<Attempt> {
  const next = await putRecord("attempts", { ...a, ...patch });
  touch();
  return next;
}

export async function attachAiFeedback(a: Attempt, feedback: AiFeedback, subLabel?: string): Promise<Attempt> {
  let aiFeedback: Attempt["aiFeedback"];
  if (subLabel) {
    aiFeedback = { ...feedbackMap(a.aiFeedback), [subLabel]: feedback };
  } else aiFeedback = feedback;
  return updateAttempt(a, { aiFeedback });
}

export async function reviewCard(cardId: string, topicId: string, subject: string, rating: Rating): Promise<CardState> {
  const cur = (await db.cardStates.get(cardId)) ?? newCardState(cardId, topicId, subject, deviceId());
  const next = review(cur, rating, deviceId());
  await putRecord("cardStates", next);
  touch();
  return next;
}

export async function getTopicProgress(topicId: string, subject: string): Promise<TopicProgress> {
  const cur = await db.topicProgress.get(topicId);
  return cur ?? { id: topicId, subject, noteReadAt: null, mastery: 0, memo: "", bookmarked: false, updatedAt: nowIso(), deletedAt: null, deviceId: deviceId() };
}

export async function updateTopicProgress(topicId: string, subject: string, patch: Partial<TopicProgress>): Promise<TopicProgress> {
  const cur = await getTopicProgress(topicId, subject);
  const next = await putRecord("topicProgress", { ...cur, ...patch, id: topicId, subject });
  touch();
  return next;
}

async function bumpTopicMastery(topicId: string, subject: string) {
  if (!topicId) return;
  const cur = await getTopicProgress(topicId, subject);
  if (cur.mastery < 2) await putRecord("topicProgress", { ...cur, mastery: 2 });
}

export async function markNoteRead(topicId: string, subject: string) {
  const cur = await getTopicProgress(topicId, subject);
  await putRecord("topicProgress", { ...cur, noteReadAt: nowIso(), mastery: Math.max(cur.mastery, 1) });
  touch();
}

export async function saveSummary(input: { id?: string; title: string; scope: SummaryScope; bodyMarkdown: string; aiNotes: string | null }): Promise<SummaryNote> {
  const existing = input.id ? await db.summaries.get(input.id) : undefined;
  const s: SummaryNote = {
    id: input.id ?? newId(),
    title: input.title,
    scope: input.scope,
    bodyMarkdown: input.bodyMarkdown,
    aiNotes: input.aiNotes,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    deviceId: deviceId(),
  };
  await putRecord("summaries", s);
  touch();
  return s;
}

export async function deleteSummary(id: string) {
  await deleteRecord("summaries", id);
  touch();
}

export async function setExamDate(date: string) {
  await saveSettings({ examDate: date });
  touch();
}

export async function setAiModel(model: string) {
  await saveSettings({ aiModel: model });
  touch();
}

/** ローカルDBの全データをエクスポート形式にまとめる */
export async function buildLocalExport(): Promise<ExportFile> {
  const data: ExportFile["data"] = { sessions: [], attempts: [], cardStates: [], topicProgress: [], summaries: [], settings: [] };
  for (const t of SYNC_TABLES) (data[t] as unknown[]) = await tableOf(t as LocalSyncTable).toArray();
  await saveSettings({ lastExportAt: nowIso() });
  touch();
  return { format: "cpa-exam-app-export", version: 1, exportedAt: nowIso(), data };
}

/** エクスポートファイルをローカルへ取り込む（merge: LWW / replace: 全削除後に読み込み） */
export async function importLocal(file: ExportFile, mode: "merge" | "replace"): Promise<number> {
  if (file.format !== "cpa-exam-app-export") throw new Error("このアプリのバックアップファイルではありません");
  let n = 0;
  await db.transaction("rw", [...SYNC_TABLES.map((t) => db[t as LocalSyncTable]), db.outbox], async () => {
    for (const t of SYNC_TABLES) {
      const table = tableOf(t as LocalSyncTable);
      if (mode === "replace") await table.clear();
      for (const rec of (file.data[t] ?? []) as { id: string; updatedAt: string }[]) {
        const cur = await table.get(rec.id);
        if (mode === "replace" || !cur || cur.updatedAt < rec.updatedAt) {
          const stamped = mode === "replace" ? { ...rec, updatedAt: nowIso(), deviceId: deviceId() } : rec;
          await table.put(stamped as never);
          await db.outbox.put({ key: `${t}:${rec.id}`, table: t, id: rec.id, updatedAt: (stamped as { updatedAt: string }).updatedAt });
          n++;
        }
      }
    }
  });
  touch();
  return n;
}

export async function clearLocalData() {
  await db.transaction("rw", [...SYNC_TABLES.map((t) => db[t as LocalSyncTable]), db.outbox, db.kv], async () => {
    for (const t of SYNC_TABLES) await tableOf(t as LocalSyncTable).clear();
    await db.outbox.clear();
    await db.kv.clear();
  });
}

export function kindOf(id: string): QuestionKind | undefined {
  return getQuestionRef(id)?.kind;
}

export function computeResult(session: StudySession, attempts: Attempt[]): SessionResult {
  const perKind: SessionResult["perKind"] = {};
  let correct = 0;
  let score = 0;
  let maxScore = 0;
  for (const a of attempts) {
    const k = (perKind[a.kind] ??= { count: 0, correct: 0, score: 0, maxScore: 0 });
    k.count++;
    if (a.isCorrect) {
      k.correct++;
      correct++;
    }
    const s = attemptScore(a);
    if (s) {
      k.score += s.score;
      k.maxScore += s.max;
      score += s.score;
      maxScore += s.max;
    }
  }
  return { total: session.questionIds.length, answered: attempts.length, correct, score, maxScore, perKind, perQuestionSec: session.perQuestionSec ?? {} };
}

/** 論述の得点（AI 採点があればそれを優先） */
export function attemptScore(a: Attempt): { score: number; max: number } | null {
  if (a.maxScore === null || a.maxScore === undefined) return null;
  if (a.aiFeedback) {
    if (isSingleFeedback(a.aiFeedback)) return { score: a.aiFeedback.score, max: a.aiFeedback.maxScore };
    const subs = Object.values(feedbackMap(a.aiFeedback));
    if (subs.length) {
      const aiScore = subs.reduce((s, f) => s + f.score, 0);
      const aiMax = subs.reduce((s, f) => s + f.maxScore, 0);
      // 一部枝問のみ AI 採点済みなら、残りは自己採点で補う
      if (aiMax >= a.maxScore) return { score: aiScore, max: a.maxScore };
    }
  }
  return { score: a.selfScore ?? 0, max: a.maxScore };
}
