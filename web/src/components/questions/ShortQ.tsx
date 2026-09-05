import { useEffect, useState } from "react";
import type { ShortAnswerQuestion } from "@cpa/shared";
import { checkShortAnswer } from "../../lib/grading";
import type { QuestionProps } from "./types";

export function ShortQ({ q, onDone }: QuestionProps<ShortAnswerQuestion>) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [override, setOverride] = useState<boolean | null>(null);
  useEffect(() => {
    setText("");
    setSubmitted(false);
    setOverride(null);
  }, [q.id]);
  const auto = checkShortAnswer(text, q.acceptedKeywords);
  const correct = override ?? auto;
  return (
    <div>
      <div className="card">
        <div className="text-xs text-slate-400 mb-2">一問一答（用語・概念を答える）</div>
        <p className="text-base leading-7">{q.question}</p>
      </div>
      {!submitted ? (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="答えを入力" autoFocus autoComplete="off" />
          <button className="btn-primary shrink-0" type="submit">
            解答
          </button>
        </form>
      ) : (
        <div className="mt-4">
          <div className={`rounded-lg p-3 ${correct ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
            <div className="font-bold">{correct ? "正解" : "不正解"}</div>
            <div className="text-sm mt-1">あなたの解答: {text || "（無記入）"}</div>
            <div className="text-sm mt-1">
              正答: <span className="font-semibold">{q.answer}</span>
            </div>
            {q.explanation && <p className="text-sm mt-1 text-slate-600 leading-6">{q.explanation}</p>}
          </div>
          {override === null && (
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
              判定は自動（キーワード一致）です。
              <button className="underline" onClick={() => setOverride(!auto)}>
                {auto ? "実は不正解にする" : "正解扱いにする"}
              </button>
            </div>
          )}
          <button className="btn-primary w-full mt-4" onClick={() => onDone({ answer: { text }, isCorrect: correct, selfScore: null, selfChecks: null, maxScore: null, aiFeedback: null })}>
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
