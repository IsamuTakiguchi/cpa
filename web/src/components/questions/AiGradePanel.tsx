import { useState } from "react";
import type { AiFeedback } from "@cpa/shared";
import { api } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { Alert } from "../ui";
import { Link } from "react-router-dom";

export function AiGradePanel({ questionId, subLabel, answerText, feedback, onGraded, model }: { questionId: string; subLabel?: string; answerText: string; feedback: AiFeedback | null; onGraded: (f: AiFeedback) => void; model?: string }) {
  const { user, aiEnabled } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grade = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.gradeEssay(questionId, answerText, subLabel, model);
      onGraded(res.feedback);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-indigo-900">AI 採点・講評</div>
        {!feedback && (
          <button className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-xs py-1.5" onClick={grade} disabled={loading || !user || !aiEnabled || answerText.trim() === ""} title={!user ? "ログインが必要です" : !aiEnabled ? "サーバーに API キーが未設定です" : ""}>
            {loading ? "採点中…（30秒ほど）" : "AIに採点してもらう"}
          </button>
        )}
      </div>
      {!user && (
        <p className="text-xs text-indigo-800 mt-1">
          AI 採点は <Link to="/auth" className="underline">ログイン</Link> すると使えます。
        </p>
      )}
      {user && !aiEnabled && <p className="text-xs text-indigo-800 mt-1">サーバーに ANTHROPIC_API_KEY が設定されていないため AI 採点は無効です（SETUP.md 参照）。</p>}
      {error && (
        <div className="mt-2">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      {feedback && (
        <div className="mt-2 space-y-3 text-sm">
          <div className="text-lg font-bold text-indigo-900">
            {feedback.score} / {feedback.maxScore} 点 <span className="text-xs font-normal text-slate-500">({feedback.model})</span>
          </div>
          <ul className="space-y-1">
            {feedback.pointResults.map((p, i) => (
              <li key={i} className="rounded border border-indigo-100 bg-white px-3 py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{p.text}</span>
                  <span className={`shrink-0 font-bold ${p.score >= p.maxScore ? "text-emerald-700" : p.score > 0 ? "text-amber-700" : "text-red-700"}`}>
                    {p.score}/{p.maxScore}
                  </span>
                </div>
                <div className="text-slate-600 text-xs mt-0.5">{p.comment}</div>
              </li>
            ))}
          </ul>
          <div>
            <div className="font-semibold text-indigo-900">講評</div>
            <p className="whitespace-pre-wrap">{feedback.feedback}</p>
          </div>
          <div>
            <div className="font-semibold text-indigo-900">改善答案</div>
            <p className="whitespace-pre-wrap bg-white rounded border border-indigo-100 p-2">{feedback.improvedAnswer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
