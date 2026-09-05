import { useEffect, useState } from "react";
import type { AiFeedback, EssayQuestion } from "@cpa/shared";
import { essayMaxScore } from "@cpa/shared";
import { Markdown } from "../Markdown";
import { AiGradePanel } from "./AiGradePanel";
import { GradingChecklist } from "./GradingChecklist";
import type { QuestionProps } from "./types";

export function EssayQ({ q, phase = "full", initialAnswer, onDraft, onDone, aiModel }: QuestionProps<EssayQuestion>) {
  const init = () => ({ ...((initialAnswer as { subs?: Record<string, string> })?.subs ?? {}) });
  const [subs, setSubs] = useState<Record<string, string>>(init);
  const [submitted, setSubmitted] = useState(phase === "grade");
  const [checks, setChecks] = useState<Record<string, number[]>>({});
  const [ai, setAi] = useState<Record<string, AiFeedback>>({});
  const [active, setActive] = useState(0);
  useEffect(() => {
    setSubs(init());
    setSubmitted(phase === "grade");
    setChecks({});
    setAi({});
    setActive(0);
  }, [q.id, phase]);
  const max = essayMaxScore(q);
  const total = q.subQuestions.reduce((s, sq) => s + (checks[sq.label] ?? []).reduce((a, i) => a + (sq.points[i]?.score ?? 0), 0), 0);
  const update = (label: string, v: string) => {
    const next = { ...subs, [label]: v };
    setSubs(next);
    onDraft?.({ subs: next });
  };
  return (
    <div>
      <div className="card">
        <div className="text-xs text-slate-400 mb-2">
          大問論述: {q.title}（{q.estimatedMinutes}分目安・{max}点）
        </div>
        <Markdown>{q.intro}</Markdown>
      </div>
      <div className="flex gap-1 mt-4 overflow-x-auto no-print">
        {q.subQuestions.map((sq, i) => (
          <button key={sq.label} className={`btn text-xs py-1.5 ${i === active ? "bg-brand text-white" : "bg-white border border-slate-300"}`} onClick={() => setActive(i)}>
            {sq.label}（{sq.allocation}点）{submitted && checks[sq.label]?.length ? " ✓" : ""}
          </button>
        ))}
      </div>
      {q.subQuestions.map((sq, i) => (
        <div key={sq.label} className={i === active ? "" : "hidden"}>
          <div className="card mt-3">
            <div className="text-sm font-bold text-brand mb-1">
              {sq.label}（{sq.allocation}点）
            </div>
            <p className="text-base leading-7 whitespace-pre-wrap">{sq.question}</p>
          </div>
          <textarea className="input mt-3 min-h-[220px] leading-7" value={subs[sq.label] ?? ""} onChange={(e) => update(sq.label, e.target.value)} disabled={submitted} placeholder="答案を入力" />
          <div className="text-right text-xs text-slate-400 mt-1">{(subs[sq.label] ?? "").length} 字</div>
          {submitted && (
            <div className="mt-2 space-y-3">
              <div className="card bg-slate-50">
                <div className="text-sm font-semibold text-slate-700 mb-1">模範解答</div>
                <p className="text-sm leading-7 whitespace-pre-wrap">{sq.modelAnswer}</p>
              </div>
              <div className="card">
                <GradingChecklist points={sq.points} checked={checks[sq.label] ?? []} onChange={(next) => setChecks({ ...checks, [sq.label]: next })} />
                <AiGradePanel questionId={q.id} subLabel={sq.label} answerText={subs[sq.label] ?? ""} feedback={ai[sq.label] ?? null} onGraded={(f) => setAi({ ...ai, [sq.label]: f })} model={aiModel} />
              </div>
              {i < q.subQuestions.length - 1 && (
                <button className="btn-secondary w-full" onClick={() => setActive(i + 1)}>
                  次の枝問へ
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      {phase === "answer" ? null : !submitted ? (
        <button className="btn-primary w-full mt-4" onClick={() => setSubmitted(true)}>
          提出して模範解答を見る（全枝問）
        </button>
      ) : (
        <button className="btn-primary w-full mt-4" onClick={() => onDone({ answer: { subs }, isCorrect: total >= max * 0.7, selfScore: total, selfChecks: checks, maxScore: max, aiFeedback: Object.keys(ai).length ? ai : null })}>
          この大問を終える（自己採点 {total} / {max} 点）
        </button>
      )}
    </div>
  );
}
