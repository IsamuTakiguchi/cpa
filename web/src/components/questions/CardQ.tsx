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
      <button className="card w-full min-h-[180px] text-left" onClick={() => setFlipped((f) => !f)} aria-label={flipped ? "表を見る" : "裏を見る"}>
        <div key={flipped ? "back" : "front"} className="animate-pop">
          <div className="text-xs text-slate-400 mb-2">{flipped ? "答え" : "問い（タップで答えを表示）"}</div>
          <div className="text-base leading-7 whitespace-pre-wrap">{flipped ? q.back : q.front}</div>
          {flipped && q.source && <div className="mt-3 text-xs text-slate-500">出典: {q.source}</div>}
        </div>
      </button>
      {flipped ? (
        <div className="grid grid-cols-4 gap-2 mt-4 animate-rise">
          {([0, 1, 2, 3] as Rating[]).map((r) => (
            <button
              key={r}
              className={`btn flex-col py-2 backdrop-blur-sm ring-1 ring-white/70 shadow-[0_4px_14px_-6px_rgba(30,58,95,.35)] ${r === 0 ? "bg-red-100/80 text-red-800 hover:bg-red-100" : r === 1 ? "bg-amber-100/80 text-amber-800 hover:bg-amber-100" : r === 2 ? "bg-emerald-100/80 text-emerald-800 hover:bg-emerald-100" : "bg-sky-100/80 text-sky-800 hover:bg-sky-100"}`}
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
