import { useEffect, useState } from "react";
import type { CalcQuestion } from "@cpa/shared";
import { checkCalc, formatNumber } from "../../lib/grading";
import { Markdown } from "../Markdown";
import type { QuestionProps } from "./types";

export function CalcQ({ q, phase = "full", initialAnswer, onDraft, onDone }: QuestionProps<CalcQuestion>) {
  const init = () => ((initialAnswer as { values?: string[] })?.values ?? q.answers.map(() => "")).slice();
  const [values, setValues] = useState<string[]>(init);
  const [submitted, setSubmitted] = useState(phase === "grade");
  useEffect(() => {
    setValues(init());
    setSubmitted(phase === "grade");
  }, [q.id, phase]);
  const result = checkCalc(values, q.answers);
  const update = (i: number, v: string) => {
    const next = values.slice();
    next[i] = v;
    setValues(next);
    onDraft?.({ values: next });
  };
  return (
    <div>
      <div className="card">
        <div className="text-xs text-slate-400 mb-2">計算問題: {q.title}</div>
        <Markdown>{q.question}</Markdown>
      </div>
      <div className="mt-4 space-y-2">
        {q.answers.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <label className="w-32 shrink-0 text-sm font-medium">{a.label}</label>
            <input className={`input ${submitted ? (result.perAnswer[i] ? "border-emerald-400 bg-emerald-50" : "border-red-400 bg-red-50") : ""}`} inputMode="decimal" value={values[i] ?? ""} onChange={(e) => update(i, e.target.value)} disabled={submitted} placeholder="数値" />
            <span className="text-sm text-slate-500 w-12 shrink-0">{a.unit ?? ""}</span>
          </div>
        ))}
      </div>
      {phase === "answer" ? null : !submitted ? (
        <button className="btn-primary w-full mt-4" onClick={() => setSubmitted(true)}>
          採点する
        </button>
      ) : (
        <div className="mt-4">
          <div className={`rounded-lg p-3 ${result.allCorrect ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
            <div className="font-bold">
              {result.allCorrect ? "全問正解" : `${result.perAnswer.filter(Boolean).length} / ${q.answers.length} 正解`}
            </div>
            <ul className="text-sm mt-1 space-y-0.5">
              {q.answers.map((a, i) => (
                <li key={i}>
                  {a.label}: 正解 <span className="font-semibold">{formatNumber(a.value)}</span>
                  {a.unit ?? ""}
                  {a.tolerance ? <span className="text-xs text-slate-500">（許容誤差 ±{a.tolerance}）</span> : null}
                </li>
              ))}
            </ul>
          </div>
          <div className="card mt-3">
            <div className="text-sm font-semibold text-slate-700 mb-1">解法</div>
            <Markdown>{q.solution}</Markdown>
          </div>
          <button className="btn-primary w-full mt-4" onClick={() => onDone({ answer: { values }, isCorrect: result.allCorrect, selfScore: null, selfChecks: null, maxScore: null, aiFeedback: null })}>
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
