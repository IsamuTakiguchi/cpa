import { useEffect, useState } from "react";
import type { AiFeedback, MiniEssayQuestion } from "@cpa/shared";
import { maxScore, selfScore } from "../../lib/grading";
import { AiGradePanel } from "./AiGradePanel";
import { GradingChecklist } from "./GradingChecklist";
import type { QuestionProps } from "./types";

export function MiniEssayQ({ q, phase = "full", initialAnswer, onDraft, onDone, aiModel }: QuestionProps<MiniEssayQuestion>) {
  const [text, setText] = useState((initialAnswer as { text?: string })?.text ?? "");
  const [submitted, setSubmitted] = useState(phase === "grade");
  const [checks, setChecks] = useState<number[]>([]);
  const [ai, setAi] = useState<AiFeedback | null>(null);
  useEffect(() => {
    setText((initialAnswer as { text?: string })?.text ?? "");
    setSubmitted(phase === "grade");
    setChecks([]);
    setAi(null);
  }, [q.id, phase]);
  const max = maxScore(q.points);
  return (
    <div>
      <div className="card">
        <div className="text-xs text-slate-400 mb-2">小論述（3〜5行・{q.estimatedMinutes}分目安・{max}点）</div>
        <p className="text-base leading-7 whitespace-pre-wrap">{q.question}</p>
      </div>
      <textarea
        className="input mt-4 min-h-[160px] leading-7"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onDraft?.({ text: e.target.value });
        }}
        disabled={submitted}
        placeholder="答案を入力（スマホの音声入力も可）"
      />
      <div className="text-right text-xs text-slate-400 mt-1">{text.length} 字</div>
      {phase === "answer" ? null : !submitted ? (
        <button className="btn-primary w-full mt-2" onClick={() => setSubmitted(true)}>
          提出して模範解答を見る
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="card bg-slate-50">
            <div className="text-sm font-semibold text-slate-700 mb-1">模範解答</div>
            <p className="text-sm leading-7 whitespace-pre-wrap">{q.modelAnswer}</p>
          </div>
          <div className="card">
            <GradingChecklist points={q.points} checked={checks} onChange={setChecks} />
            <AiGradePanel questionId={q.id} answerText={text} feedback={ai} onGraded={setAi} model={aiModel} />
          </div>
          <button className="btn-primary w-full" onClick={() => onDone({ answer: { text }, isCorrect: selfScore(q.points, checks) >= max * 0.7, selfScore: selfScore(q.points, checks), selfChecks: checks, maxScore: max, aiFeedback: ai })}>
            次へ（自己採点 {selfScore(q.points, checks)} / {max} 点）
          </button>
        </div>
      )}
    </div>
  );
}
