import type { ExamFormat, QuestionKind, QuestionRef, Subject, SubjectId, Topic } from "./types";
import { financialSystemMap, financialTopics } from "./financial";
import { managerialSystemMap, managerialTopics } from "./managerial";
import { auditSystemMap, auditTopics } from "./audit";
import { taxSystemMap, taxTopics } from "./tax";

export const SUBJECTS: Subject[] = [
  {
    id: "managerial",
    name: "管理会計論",
    shortName: "管理",
    examNote: "会計学（午前）2時間・大問2",
    color: "#0f766e",
    topics: sortTopics(managerialTopics),
    systemMap: managerialSystemMap,
  },
  {
    id: "financial",
    name: "財務会計論",
    shortName: "財務",
    examNote: "会計学（午後）3時間・大問3",
    color: "#1d4ed8",
    topics: sortTopics(financialTopics),
    systemMap: financialSystemMap,
  },
  {
    id: "audit",
    name: "監査論",
    shortName: "監査",
    examNote: "2時間・大問2",
    color: "#7c3aed",
    topics: sortTopics(auditTopics),
    systemMap: auditSystemMap,
  },
  {
    id: "tax",
    name: "租税法",
    shortName: "租税",
    examNote: "2時間・大問2（理論＋計算）",
    color: "#b45309",
    topics: sortTopics(taxTopics),
    systemMap: taxSystemMap,
  },
];

/** 本試験（論文式）の科目別構成 */
export const EXAM_FORMATS: ExamFormat[] = [
  { subject: "managerial", label: "会計学 午前（管理会計論）", minutes: 120, essayCount: 2, calcCount: 0 },
  { subject: "financial", label: "会計学 午後（財務会計論）", minutes: 180, essayCount: 3, calcCount: 0 },
  { subject: "audit", label: "監査論", minutes: 120, essayCount: 2, calcCount: 0 },
  { subject: "tax", label: "租税法", minutes: 120, essayCount: 1, calcCount: 1 },
];

export const KIND_LABELS: Record<QuestionKind, string> = {
  card: "暗記カード",
  tf: "正誤問題",
  short: "一問一答",
  mini: "小論述",
  essay: "大問論述",
  calc: "計算問題",
};

export const KIND_ORDER: QuestionKind[] = ["card", "tf", "short", "mini", "calc", "essay"];

function sortTopics(topics: Topic[]): Topic[] {
  return [...topics].sort((a, b) => a.order - b.order);
}

const subjectMap = new Map<SubjectId, Subject>(SUBJECTS.map((s) => [s.id, s]));
const topicMap = new Map<string, Topic>();
for (const s of SUBJECTS) for (const t of s.topics) topicMap.set(t.id, t);

export function getSubject(id: string): Subject | undefined {
  return subjectMap.get(id as SubjectId);
}

export function getTopic(id: string): Topic | undefined {
  return topicMap.get(id);
}

export function allTopics(): Topic[] {
  return SUBJECTS.flatMap((s) => s.topics);
}

export type AnyQuestion =
  | { kind: "card"; topic: Topic; q: Topic["cards"][number] }
  | { kind: "tf"; topic: Topic; q: Topic["trueFalse"][number] }
  | { kind: "short"; topic: Topic; q: Topic["shortAnswers"][number] }
  | { kind: "mini"; topic: Topic; q: Topic["miniEssays"][number] }
  | { kind: "essay"; topic: Topic; q: Topic["essays"][number] }
  | { kind: "calc"; topic: Topic; q: Topic["calcs"][number] };

const questionIndex = new Map<string, AnyQuestion>();
const refIndex = new Map<string, QuestionRef>();

function register(kind: QuestionKind, topic: Topic, q: { id: string }, minutes: number, difficulty: 1 | 2 | 3) {
  questionIndex.set(q.id, { kind, topic, q } as AnyQuestion);
  refIndex.set(q.id, { id: q.id, kind, subject: topic.subject, topicId: topic.id, estimatedMinutes: minutes, difficulty });
}

for (const t of allTopics()) {
  for (const c of t.cards) register("card", t, c, 0.3, 1);
  for (const q of t.trueFalse) register("tf", t, q, 0.5, q.difficulty);
  for (const q of t.shortAnswers) register("short", t, q, 1, q.difficulty);
  for (const q of t.miniEssays) register("mini", t, q, q.estimatedMinutes, q.difficulty);
  for (const q of t.essays) register("essay", t, q, q.estimatedMinutes, q.difficulty);
  for (const q of t.calcs) register("calc", t, q, q.estimatedMinutes, q.difficulty);
}

export function getQuestion(id: string): AnyQuestion | undefined {
  return questionIndex.get(id);
}

export function getQuestionRef(id: string): QuestionRef | undefined {
  return refIndex.get(id);
}

export function allQuestionRefs(): QuestionRef[] {
  return [...refIndex.values()];
}

/** 論述の満点を返す */
export function essayMaxScore(q: Topic["essays"][number]): number {
  return q.subQuestions.reduce((s, sq) => s + sq.allocation, 0);
}

export function miniMaxScore(q: Topic["miniEssays"][number]): number {
  return q.points.reduce((s, p) => s + p.score, 0);
}

/** 全図解（論点図解のみ） */
export function allDiagrams(): { topic: Topic; diagram: import("./types").Diagram }[] {
  return allTopics().flatMap((t) => (t.diagrams ?? []).map((diagram) => ({ topic: t, diagram })));
}

export function topicQuestionCount(t: Topic): Record<QuestionKind, number> {
  return {
    card: t.cards.length,
    tf: t.trueFalse.length,
    short: t.shortAnswers.length,
    mini: t.miniEssays.length,
    essay: t.essays.length,
    calc: t.calcs.length,
  };
}
