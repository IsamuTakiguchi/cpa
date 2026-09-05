import { useEffect, useState } from "react";
import type { Card, CardState } from "@cpa/shared";
import { db } from "../../db/local";
import { previewIntervals, RATING_LABELS, type Rating } from "../../lib/srs";
import type { QuestionProps } from "./types";

export function CardQ({ q, onDone }: QuestionProps<Card>) {
  const [flipped, setFlipped] = useState(false);
  const [state, setState] = useState<CardState | null>(null);
  useEffect(() => {
    setFlipped(false);
    db.cardStates.get(q.id).then((s) => setState(s ?? null));
  }, [q.id]);
  const intervals = state ? previewIntervals(state) : null;
  return (
    <div>
      <button className="card w-full min-h-[180px] text-left hover:shadow-md transition" onClick={() => setFlipped((f) => !f)} aria-label={flipped ? "表を見る" : "裏を見る"}>
        <div className="text-xs text-slate-400 mb-2">{flipped ? "答え" : "問い（タップで答えを表示）"}</div>
        <div className="text-base leading-7 whitespace-pre-wrap">{flipped ? q.back : q.front}</div>
        {flipped && q.source && <div className="mt-3 text-xs text-slate-500">出典: {q.source}</div>}
      </button>
      {flipped ? (
        <div className="grid grid-cols-4 gap-2 mt-4">
          {([0, 1, 2, 3] as Rating[]).map((r) => (
            <button
              key={r}
              className={`btn flex-col py-2 ${r === 0 ? "bg-red-100 text-red-800" : r === 1 ? "bg-amber-100 text-amber-800" : r === 2 ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}
              onClick={() => onDone({ answer: { rating: r }, isCorrect: r >= 2, selfScore: null, selfChecks: null, maxScore: null, aiFeedback: null })}
            >
              <span className="font-semibold">{RATING_LABELS[r]}</span>
              {intervals && <span className="text-[10px] opacity-70">{intervals[r]}</span>}
            </button>
          ))}
        </div>
      ) : (
        <button className="btn-primary w-full mt-4" onClick={() => setFlipped(true)}>
          答えを見る
        </button>
      )}
    </div>
  );
}
