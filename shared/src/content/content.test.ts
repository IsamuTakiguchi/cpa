import { describe, expect, it } from "vitest";
import { EXAM_FORMATS, SUBJECTS, allQuestionRefs, allTopics, essayMaxScore } from "./index";

describe("コンテンツ整合性", () => {
  it("論点 id と問題 id が一意である", () => {
    const ids = new Set<string>();
    for (const t of allTopics()) {
      expect(ids.has(t.id), `重複 topic id: ${t.id}`).toBe(false);
      ids.add(t.id);
    }
    const qids = new Set<string>();
    for (const r of allQuestionRefs()) {
      expect(qids.has(r.id), `重複 question id: ${r.id}`).toBe(false);
      qids.add(r.id);
    }
  });

  it("問題 id が論点 id を接頭辞に持つ", () => {
    for (const t of allTopics()) {
      const all = [...t.cards, ...t.trueFalse, ...t.shortAnswers, ...t.miniEssays, ...t.essays, ...t.calcs];
      for (const q of all) expect(q.id.startsWith(t.id + "-"), `${q.id} は ${t.id}- で始まる必要`).toBe(true);
    }
  });

  it("論述の配点合計が枝問配点・満点と一致する", () => {
    for (const t of allTopics()) {
      for (const e of t.essays) {
        for (const sq of e.subQuestions) {
          const sum = sq.points.reduce((s, p) => s + p.score, 0);
          expect(sum, `${e.id} ${sq.label} の配点合計`).toBe(sq.allocation);
        }
        expect(essayMaxScore(e)).toBeGreaterThan(0);
      }
      for (const m of t.miniEssays) {
        expect(m.points.length, `${m.id} の採点ポイント`).toBeGreaterThanOrEqual(2);
        expect(m.points.reduce((s, p) => s + p.score, 0)).toBeGreaterThan(0);
      }
    }
  });

  it("計算問題の正解が有限の数値で、解答欄が1つ以上ある", () => {
    for (const t of allTopics()) {
      for (const c of t.calcs) {
        expect(c.answers.length).toBeGreaterThan(0);
        for (const a of c.answers) {
          expect(Number.isFinite(a.value), `${c.id} ${a.label}`).toBe(true);
          if (a.tolerance !== undefined) expect(a.tolerance).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("一問一答は受理キーワードを1つ以上持つ", () => {
    for (const t of allTopics()) {
      for (const q of t.shortAnswers) expect(q.acceptedKeywords.length, q.id).toBeGreaterThan(0);
    }
  });

  it("各論点に note・summary・カードがある", () => {
    for (const t of allTopics()) {
      expect(t.note.trim().length, t.id).toBeGreaterThan(200);
      expect(t.summary.trim().length, t.id).toBeGreaterThan(20);
      expect(t.cards.length, t.id).toBeGreaterThanOrEqual(4);
    }
  });

  it("各論点に図解が1枚以上あり、id が一意で本文が空でない", () => {
    const ids = new Set<string>();
    for (const t of allTopics()) {
      const ds = t.diagrams ?? [];
      expect(ds.length, `${t.id} の図解`).toBeGreaterThanOrEqual(1);
      for (const d of ds) {
        expect(d.id.startsWith(t.id + "-fig-"), d.id).toBe(true);
        expect(ids.has(d.id), `重複 diagram id: ${d.id}`).toBe(false);
        ids.add(d.id);
        expect(d.mermaid.trim().length, d.id).toBeGreaterThan(20);
        expect(d.caption.trim().length, d.id).toBeGreaterThan(5);
        expect(d.keyPoints.length, d.id).toBeGreaterThanOrEqual(1);
      }
    }
    for (const s of SUBJECTS) {
      expect(s.systemMap.mermaid.includes("TODO"), `${s.id} の体系マップがプレースホルダのまま`).toBe(false);
      expect(Object.keys(s.systemMap.nodeTopics).length, `${s.id} の nodeTopics`).toBe(s.topics.length);
    }
  });

  it("各科目に本試験1回分の大問論述がある", () => {
    for (const f of EXAM_FORMATS) {
      const subject = SUBJECTS.find((s) => s.id === f.subject)!;
      const essays = subject.topics.flatMap((t) => t.essays).length;
      const calcs = subject.topics.flatMap((t) => t.calcs).length;
      expect(essays, `${subject.name} の大問論述数`).toBeGreaterThanOrEqual(f.essayCount);
      expect(calcs, `${subject.name} の計算問題数`).toBeGreaterThanOrEqual(f.calcCount);
    }
  });
});
