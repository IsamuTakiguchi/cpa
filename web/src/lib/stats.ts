import type { Attempt, CardState, StudySession, TopicProgress } from "@cpa/shared";
import { allQuestionRefs, checksMap, feedbackMap, getQuestion, getQuestionRef, isSingleFeedback, SUBJECTS, type SubjectId } from "@cpa/shared";
import type { PlannerHistory } from "./sessionPlanner";
import { attemptScore } from "./repo";

/** 問題ごとの直近の成績（正答率 or 得点率） */
export function accuracyOf(a: Attempt): number | null {
  if (a.kind === "card") {
    const r = (a.answer as { rating?: number })?.rating ?? 0;
    return r >= 2 ? 1 : 0;
  }
  const s = attemptScore(a);
  if (s && s.max > 0) return s.score / s.max;
  if (a.isCorrect === null) return null;
  return a.isCorrect ? 1 : 0;
}

export function latestAttemptByQuestion(attempts: Attempt[]): Map<string, Attempt> {
  const m = new Map<string, Attempt>();
  for (const a of attempts) {
    if (a.deletedAt) continue;
    const cur = m.get(a.questionId);
    if (!cur || cur.createdAt < a.createdAt) m.set(a.questionId, a);
  }
  return m;
}

export function buildHistory(attempts: Attempt[], cardStates: CardState[]): PlannerHistory {
  const accuracy = new Map<string, number>();
  const counts = new Map<string, number>();
  const topicAcc = new Map<string, { s: number; n: number }>();
  // 直近3回の平均
  const recent = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (a.deletedAt) continue;
    counts.set(a.questionId, (counts.get(a.questionId) ?? 0) + 1);
    const arr = recent.get(a.questionId) ?? [];
    arr.push(a);
    recent.set(a.questionId, arr);
  }
  for (const [qid, arr] of recent) {
    arr.sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
    const vals = arr
      .slice(0, 3)
      .map(accuracyOf)
      .filter((v): v is number => v !== null);
    if (!vals.length) continue;
    const acc = vals.reduce((s, v) => s + v, 0) / vals.length;
    accuracy.set(qid, acc);
    const ref = getQuestionRef(qid);
    if (ref) {
      const t = topicAcc.get(ref.topicId) ?? { s: 0, n: 0 };
      t.s += acc;
      t.n += 1;
      topicAcc.set(ref.topicId, t);
    }
  }
  const cardDue = new Map<string, string>();
  for (const c of cardStates) if (!c.deletedAt) cardDue.set(c.id, c.dueAt);
  const topicAccuracy = new Map<string, number>();
  for (const [t, v] of topicAcc) topicAccuracy.set(t, v.s / v.n);
  return { accuracy, attempts: counts, cardDue, topicAccuracy };
}

export interface SubjectStats {
  subject: SubjectId;
  name: string;
  color: string;
  topics: number;
  topicsStarted: number;
  questions: number;
  questionsSeen: number;
  accuracy: number | null;
  dueCards: number;
}

export function subjectStats(attempts: Attempt[], cardStates: CardState[], progress: TopicProgress[], now = new Date()): SubjectStats[] {
  const latest = latestAttemptByQuestion(attempts);
  const refs = allQuestionRefs();
  return SUBJECTS.map((s) => {
    const sRefs = refs.filter((r) => r.subject === s.id);
    const seen = sRefs.filter((r) => latest.has(r.id));
    const accs = seen.map((r) => accuracyOf(latest.get(r.id)!)).filter((v): v is number => v !== null);
    const started = progress.filter((p) => p.subject === s.id && !p.deletedAt && p.mastery > 0).length;
    const due = cardStates.filter((c) => c.subject === s.id && !c.deletedAt && new Date(c.dueAt) <= now).length;
    return {
      subject: s.id,
      name: s.name,
      color: s.color,
      topics: s.topics.length,
      topicsStarted: started,
      questions: sRefs.length,
      questionsSeen: seen.length,
      accuracy: accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : null,
      dueCards: due,
    };
  });
}

export interface WeakItem {
  attempt: Attempt;
  accuracy: number;
  title: string;
  topicTitle: string;
  subject: SubjectId;
  /** 落とした採点ポイント（論述） */
  missed: { subLabel?: string; points: string[] }[];
}

/** 弱点（直近成績 < threshold）を成績の低い順に */
export function weakItems(attempts: Attempt[], threshold = 0.7, limit = 30): WeakItem[] {
  const latest = latestAttemptByQuestion(attempts);
  const out: WeakItem[] = [];
  for (const a of latest.values()) {
    if (a.kind === "card") continue;
    const acc = accuracyOf(a);
    if (acc === null || acc >= threshold) continue;
    const q = getQuestion(a.questionId);
    if (!q) continue;
    const title = q.kind === "tf" ? q.q.statement : q.kind === "short" ? q.q.question : q.kind === "mini" ? q.q.question : q.kind === "essay" ? q.q.title : q.kind === "calc" ? q.q.title : "";
    out.push({ attempt: a, accuracy: acc, title, topicTitle: q.topic.title, subject: q.topic.subject, missed: missedPoints(a) });
  }
  return out.sort((x, y) => x.accuracy - y.accuracy).slice(0, limit);
}

export function missedPoints(a: Attempt): { subLabel?: string; points: string[] }[] {
  const q = getQuestion(a.questionId);
  if (!q) return [];
  if (q.kind === "mini") {
    const checks = Array.isArray(a.selfChecks) ? a.selfChecks : [];
    const ai = isSingleFeedback(a.aiFeedback) ? a.aiFeedback : null;
    const points = q.q.points.map((p, i) => ({ p, i })).filter(({ p, i }) => (ai ? (ai.pointResults[i]?.score ?? 0) < p.score : !checks.includes(i)));
    return points.length ? [{ points: points.map((x) => x.p.text) }] : [];
  }
  if (q.kind === "essay") {
    const checks = checksMap(a.selfChecks);
    const ai = feedbackMap(a.aiFeedback);
    return q.q.subQuestions
      .map((sq) => {
        const c = checks[sq.label] ?? [];
        const f = ai[sq.label];
        const pts = sq.points.map((p, i) => ({ p, i })).filter(({ p, i }) => (f ? (f.pointResults[i]?.score ?? 0) < p.score : !c.includes(i)));
        return { subLabel: sq.label, points: pts.map((x) => x.p.text) };
      })
      .filter((x) => x.points.length);
  }
  return [];
}

export function dueCardCount(cardStates: CardState[], now = new Date()): number {
  return cardStates.filter((c) => !c.deletedAt && new Date(c.dueAt) <= now).length;
}

export function studyMinutesByDay(sessions: StudySession[], days = 14): { day: string; minutes: number }[] {
  const map = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const s of sessions) {
    if (s.deletedAt) continue;
    const day = s.startedAt.slice(0, 10);
    if (map.has(day)) map.set(day, (map.get(day) ?? 0) + s.elapsedSec / 60);
  }
  return [...map.entries()].map(([day, minutes]) => ({ day, minutes: Math.round(minutes) }));
}

export function daysUntil(dateStr: string, now = new Date()): number {
  const target = new Date(dateStr + "T00:00:00");
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - start.getTime()) / 86400000);
}
