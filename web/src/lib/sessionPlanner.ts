/**
 * 出題プランナー: セッション設定から出題する問題 id の並びを決める。
 * 学習履歴（弱点・SRS期限・既出）を考慮する。
 */
import { EXAM_FORMATS, SUBJECTS, allQuestionRefs, getQuestionRef, type QuestionKind, type QuestionRef, type SessionConfig, type SubjectId } from "@cpa/shared";

export interface PlannerHistory {
  /** 問題 id → 直近の正答率 (0..1)。論述は得点率 */
  accuracy: Map<string, number>;
  /** 問題 id → 出題回数 */
  attempts: Map<string, number>;
  /** カード id → 期限（ISO）。未学習カードは含まれない */
  cardDue: Map<string, string>;
  /** 論点 id → 論点単位の正答率 */
  topicAccuracy: Map<string, number>;
}

export const EMPTY_HISTORY: PlannerHistory = { accuracy: new Map(), attempts: new Map(), cardDue: new Map(), topicAccuracy: new Map() };

export interface Preset {
  id: string;
  title: string;
  description: string;
  /** 所要時間の目安（分） */
  minutes: number;
  build: (subjects?: SubjectId[]) => SessionConfig;
}

export const KIND_MINUTES: Record<QuestionKind, number> = { card: 0.3, tf: 0.5, short: 1, mini: 6, calc: 8, essay: 40 };

function base(partial: Partial<SessionConfig>): SessionConfig {
  return {
    preset: "custom",
    title: "カスタム",
    subjects: [],
    topicIds: [],
    kinds: ["card", "tf", "short"],
    maxQuestions: 10,
    timeLimitMinutes: 0,
    order: "weak",
    preferUnseen: true,
    examMode: false,
    ...partial,
  };
}

export const PRESETS: Preset[] = [
  {
    id: "quick5",
    title: "スキマ5分",
    description: "暗記カード10枚＋正誤5問。復習期限が来ているものから自動選択",
    minutes: 5,
    build: (subjects) => base({ preset: "quick5", title: "スキマ5分", subjects: subjects ?? [], kinds: ["card", "tf"], maxQuestions: 15, timeLimitMinutes: 5, order: "weak" }),
  },
  {
    id: "commute15",
    title: "通勤15分",
    description: "一問一答10問＋小論述1問",
    minutes: 15,
    build: (subjects) => base({ preset: "commute15", title: "通勤15分", subjects: subjects ?? [], kinds: ["short", "mini"], maxQuestions: 11, timeLimitMinutes: 15, order: "weak" }),
  },
  {
    id: "focus30",
    title: "1論点集中30分",
    description: "選んだ論点のカード→正誤→一問一答→小論述→計算を通しで",
    minutes: 30,
    build: (subjects) => base({ preset: "focus30", title: "1論点集中30分", subjects: subjects ?? [], kinds: ["card", "tf", "short", "mini", "calc"], maxQuestions: 0, timeLimitMinutes: 30, order: "topic", preferUnseen: false }),
  },
  {
    id: "weak",
    title: "弱点補強",
    description: "正答率・得点率が低い問題を自動抽出（20問）",
    minutes: 25,
    build: (subjects) => base({ preset: "weak", title: "弱点補強", subjects: subjects ?? [], kinds: ["tf", "short", "mini", "calc"], maxQuestions: 20, timeLimitMinutes: 0, order: "weak", preferUnseen: false }),
  },
];

/** 本試験形式のプリセット（科目ごと） */
export function examPreset(subject: SubjectId): SessionConfig {
  const f = EXAM_FORMATS.find((x) => x.subject === subject)!;
  const kinds: QuestionKind[] = f.calcCount > 0 ? ["essay", "calc"] : ["essay"];
  return base({
    preset: `exam-${subject}`,
    title: `本試験形式: ${f.label}`,
    subjects: [subject],
    kinds,
    maxQuestions: f.essayCount + f.calcCount,
    timeLimitMinutes: f.minutes,
    order: "random",
    preferUnseen: true,
    examMode: true,
  });
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** 弱点優先スコア（小さいほど先に出す） */
function weakScore(ref: QuestionRef, h: PlannerHistory, now: number): number {
  if (ref.kind === "card") {
    const due = h.cardDue.get(ref.id);
    if (!due) return 0.5; // 未学習カードは期限切れの次
    const overdueDays = (now - new Date(due).getTime()) / 86400000;
    return overdueDays >= 0 ? -overdueDays : 1 + -overdueDays; // 期限切れが先、未到来は後
  }
  const acc = h.accuracy.get(ref.id);
  if (acc === undefined) return 0.6 + (h.topicAccuracy.get(ref.topicId) ?? 0.5) * 0.4; // 未出題は論点正答率で
  return acc + 0.01 * (h.attempts.get(ref.id) ?? 0);
}

export interface PlanResult {
  questionIds: string[];
  estimatedMinutes: number;
}

/**
 * 設定に基づいて問題を選ぶ。
 * - kinds/subjects/topicIds で候補を絞る
 * - order で並べ（topic: 論点順→種別順, random, weak: 弱点スコア順）
 * - maxQuestions と timeLimitMinutes（所要時間の合計）で打ち切る
 * - 本試験形式: essay を essayCount 問、calc を calcCount 問、ランダム
 */
export function planSession(config: SessionConfig, history: PlannerHistory = EMPTY_HISTORY, rand: () => number = Math.random, now = Date.now()): PlanResult {
  const subjects = new Set(config.subjects);
  const topics = new Set(config.topicIds);
  const kinds = new Set(config.kinds as QuestionKind[]);
  let refs = allQuestionRefs().filter((r) => kinds.has(r.kind) && (subjects.size === 0 || subjects.has(r.subject)) && (topics.size === 0 || topics.has(r.topicId)));

  if (config.examMode) {
    const subject = config.subjects[0] as SubjectId | undefined;
    const f = EXAM_FORMATS.find((x) => x.subject === subject);
    const pick = (kind: QuestionKind, n: number) => {
      const pool = refs.filter((r) => r.kind === kind);
      const unseen = pool.filter((r) => !(history.attempts.get(r.id) ?? 0));
      const ordered = config.preferUnseen && unseen.length >= n ? shuffle(unseen, rand) : shuffle(pool, rand);
      // 同じ論点からの重複を避ける
      const out: QuestionRef[] = [];
      const usedTopics = new Set<string>();
      for (const r of ordered) {
        if (out.length >= n) break;
        if (usedTopics.has(r.topicId) && ordered.length - out.length > n - out.length) continue;
        out.push(r);
        usedTopics.add(r.topicId);
      }
      for (const r of ordered) {
        if (out.length >= n) break;
        if (!out.includes(r)) out.push(r);
      }
      return out;
    };
    const essays = pick("essay", f?.essayCount ?? config.maxQuestions);
    const calcs = f && f.calcCount > 0 ? pick("calc", f.calcCount) : [];
    const chosen = [...essays, ...calcs];
    return { questionIds: chosen.map((r) => r.id), estimatedMinutes: f?.minutes ?? chosen.reduce((s, r) => s + r.estimatedMinutes, 0) };
  }

  if (config.order === "random") refs = shuffle(refs, rand);
  else if (config.order === "weak") {
    refs = shuffle(refs, rand).sort((a, b) => weakScore(a, history, now) - weakScore(b, history, now));
  } else {
    const topicOrder = new Map<string, number>();
    let i = 0;
    for (const s of SUBJECTS) for (const t of s.topics) topicOrder.set(t.id, i++);
    const kindOrder: QuestionKind[] = ["card", "tf", "short", "mini", "calc", "essay"];
    refs = [...refs].sort((a, b) => (topicOrder.get(a.topicId) ?? 0) - (topicOrder.get(b.topicId) ?? 0) || kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind) || a.id.localeCompare(b.id));
  }

  if (config.preferUnseen && config.order !== "topic") {
    const unseen = refs.filter((r) => !(history.attempts.get(r.id) ?? 0));
    const seen = refs.filter((r) => (history.attempts.get(r.id) ?? 0) > 0);
    refs = [...unseen, ...seen];
    if (config.order === "weak") refs.sort((a, b) => weakScore(a, history, now) - weakScore(b, history, now));
  }

  // 種別ごとのバランス: quick5 など複数種別の場合、各種別が maxQuestions の比率で入るように交互に取る
  const byKind = new Map<QuestionKind, QuestionRef[]>();
  for (const r of refs) {
    if (!byKind.has(r.kind)) byKind.set(r.kind, []);
    byKind.get(r.kind)!.push(r);
  }
  const chosen: QuestionRef[] = [];
  let minutes = 0;
  const limitN = config.maxQuestions > 0 ? config.maxQuestions : Infinity;
  const limitT = config.timeLimitMinutes > 0 ? config.timeLimitMinutes : Infinity;
  const kindList = (["card", "tf", "short", "mini", "calc", "essay"] as QuestionKind[]).filter((k) => byKind.has(k));
  // 短い種別を多め、長い種別を少なめに: 目標比率 = 1/所要時間 の重み
  const weights = kindList.map((k) => 1 / KIND_MINUTES[k]);
  const totalW = weights.reduce((s, w) => s + w, 0);
  const quota = new Map<QuestionKind, number>();
  if (config.order === "topic") {
    for (const r of refs) {
      if (chosen.length >= limitN || minutes + r.estimatedMinutes > limitT) break;
      chosen.push(r);
      minutes += r.estimatedMinutes;
    }
  } else {
    kindList.forEach((k, i) => quota.set(k, Number.isFinite(limitN) ? Math.max(1, Math.round((limitN * weights[i]!) / totalW)) : Infinity));
    let progress = true;
    while (progress && chosen.length < limitN) {
      progress = false;
      for (const k of kindList) {
        const pool = byKind.get(k)!;
        const taken = chosen.filter((c) => c.kind === k).length;
        if (taken >= (quota.get(k) ?? Infinity) || pool.length === 0) continue;
        const next = pool.shift()!;
        if (minutes + next.estimatedMinutes > limitT) continue;
        chosen.push(next);
        minutes += next.estimatedMinutes;
        progress = true;
        if (chosen.length >= limitN) break;
      }
    }
    // 割当てに余りがあれば埋める
    for (const k of kindList) {
      const pool = byKind.get(k)!;
      while (pool.length && chosen.length < limitN) {
        const next = pool.shift()!;
        if (minutes + next.estimatedMinutes > limitT) break;
        chosen.push(next);
        minutes += next.estimatedMinutes;
      }
    }
  }
  // カード→正誤→一問一答→小論述→計算→論述 の順に整える（弱点順・ランダムの中では種別ごとに）
  if (config.order !== "topic") {
    const kindOrder: QuestionKind[] = ["card", "tf", "short", "mini", "calc", "essay"];
    chosen.sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind));
  }
  return { questionIds: chosen.map((r) => r.id), estimatedMinutes: Math.round(minutes) };
}

export function estimateMinutes(ids: string[]): number {
  return Math.round(ids.reduce((s, id) => s + (getQuestionRef(id)?.estimatedMinutes ?? 0), 0));
}
