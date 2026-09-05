import { describe, expect, it } from "vitest";
import { EXAM_FORMATS, getQuestionRef, SUBJECTS } from "@cpa/shared";
import { EMPTY_HISTORY, examPreset, planSession, PRESETS, type PlannerHistory } from "./sessionPlanner";

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe("セッションプランナー", () => {
  it("スキマ5分は問題数と時間の枠内に収まる", () => {
    const cfg = PRESETS.find((p) => p.id === "quick5")!.build();
    const plan = planSession(cfg, EMPTY_HISTORY, seeded());
    expect(plan.questionIds.length).toBeGreaterThan(0);
    expect(plan.questionIds.length).toBeLessThanOrEqual(15);
    expect(plan.estimatedMinutes).toBeLessThanOrEqual(5);
    const kinds = new Set(plan.questionIds.map((id) => getQuestionRef(id)!.kind));
    expect([...kinds].every((k) => k === "card" || k === "tf")).toBe(true);
    // カードが正誤より多い
    const cards = plan.questionIds.filter((id) => getQuestionRef(id)!.kind === "card").length;
    expect(cards).toBeGreaterThan(plan.questionIds.length - cards);
  });

  it("本試験形式は科目ごとの大問数になる", () => {
    for (const f of EXAM_FORMATS) {
      const subject = SUBJECTS.find((s) => s.id === f.subject)!;
      const available = subject.topics.flatMap((t) => t.essays).length;
      if (available < f.essayCount) continue; // コンテンツ作成途中はスキップ
      const plan = planSession(examPreset(f.subject), EMPTY_HISTORY, seeded(7));
      const essays = plan.questionIds.filter((id) => getQuestionRef(id)!.kind === "essay");
      const calcs = plan.questionIds.filter((id) => getQuestionRef(id)!.kind === "calc");
      expect(essays.length).toBe(f.essayCount);
      expect(calcs.length).toBe(f.calcCount);
      expect(plan.estimatedMinutes).toBe(f.minutes);
      expect(plan.questionIds.every((id) => getQuestionRef(id)!.subject === f.subject)).toBe(true);
    }
  });

  it("弱点優先は正答率の低い問題を先に選ぶ", () => {
    const fa = SUBJECTS.find((s) => s.id === "financial")!;
    const tfs = fa.topics.flatMap((t) => t.trueFalse);
    if (tfs.length < 3) return;
    const weakId = tfs[2]!.id;
    const h: PlannerHistory = { ...EMPTY_HISTORY, accuracy: new Map(tfs.map((q) => [q.id, q.id === weakId ? 0 : 1])), attempts: new Map(tfs.map((q) => [q.id, 1])) };
    const plan = planSession({ preset: "custom", title: "", subjects: ["financial"], topicIds: [], kinds: ["tf"], maxQuestions: 1, timeLimitMinutes: 0, order: "weak", preferUnseen: false, examMode: false }, h, seeded(3));
    expect(plan.questionIds).toEqual([weakId]);
  });

  it("論点順は論点→種別の順に並ぶ", () => {
    const plan = planSession({ preset: "custom", title: "", subjects: ["financial"], topicIds: ["fa-01"], kinds: ["card", "tf", "short"], maxQuestions: 0, timeLimitMinutes: 0, order: "topic", preferUnseen: false, examMode: false });
    const kinds = plan.questionIds.map((id) => getQuestionRef(id)!.kind);
    const order = ["card", "tf", "short"];
    for (let i = 1; i < kinds.length; i++) expect(order.indexOf(kinds[i]!)).toBeGreaterThanOrEqual(order.indexOf(kinds[i - 1]!));
  });

  it("制限時間だけ指定した場合は所要時間で打ち切る", () => {
    const plan = planSession({ preset: "custom", title: "", subjects: [], topicIds: [], kinds: ["mini", "calc"], maxQuestions: 0, timeLimitMinutes: 14, order: "random", preferUnseen: true, examMode: false }, EMPTY_HISTORY, seeded(5));
    expect(plan.estimatedMinutes).toBeLessThanOrEqual(14);
    expect(plan.questionIds.length).toBeGreaterThan(0);
  });
});
