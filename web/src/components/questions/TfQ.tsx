import { useEffect, useState } from "react";
import type { TrueFalseQuestion } from "@cpa/shared";
import type { QuestionProps } from "./types";

export function TfQ({ q, onDone }: QuestionProps<TrueFalseQuestion>) {
  const [choice, setChoice] = useState<boolean | null>(null);
  useEffect(() => setChoice(null), [q.id]);
  const correct = choice !== null && choice === q.answer;
  return (
    <div>
      <div className="card">
        <div className="text-xs text-slate-400 mb-2">次の記述は正しいか（○）誤っているか（×）</div>
        <p className="text-base leading-7">{q.statement}</p>
      </div>
      {choice === null ? (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button className="btn bg-emerald-600 text-white text-2xl py-4" onClick={() => setChoice(true)}>
            ○
          </button>
          <button className="btn bg-rose-600 text-white text-2xl py-4" onClick={() => setChoice(false)}>
            ×
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <div className={`rounded-lg p-3 ${correct ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
            <div className="font-bold">
              {correct ? "正解" : "不正解"}　正答: {q.answer ? "○" : "×"}
            </div>
            <p className="text-sm mt-1 leading-6">{q.reason}</p>
          </div>
          <button className="btn-primary w-full mt-4" onClick={() => onDone({ answer: { value: choice }, isCorrect: correct, selfScore: null, selfChecks: null, maxScore: null, aiFeedback: null })}>
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
