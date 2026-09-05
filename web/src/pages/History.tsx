import { useState } from "react";
import { Link } from "react-router-dom";
import { getQuestion, SUBJECTS } from "@cpa/shared";
import { formatDate, formatDuration, KindChip, PageTitle, pct, SubjectChip } from "../components/ui";
import { useAttempts, useSessions } from "../hooks/useData";
import { attemptScore, deleteSession } from "../lib/repo";
import { accuracyOf } from "../lib/stats";

export function HistoryPage() {
  const sessions = useSessions().sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  const attempts = useAttempts();
  const [tab, setTab] = useState<"sessions" | "essays">("sessions");
  const essays = attempts.filter((a) => a.kind === "mini" || a.kind === "essay").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div>
      <PageTitle title="履歴" subtitle={`セッション ${sessions.length} 回・解答 ${attempts.length} 件`} />
      <div className="flex border-b border-slate-200 mb-4">
        {(["sessions", "essays"] as const).map((t) => (
          <button key={t} className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === t ? "border-brand text-brand font-semibold" : "border-transparent text-slate-500"}`} onClick={() => setTab(t)}>
            {t === "sessions" ? "セッション" : `答案（${essays.length}）`}
          </button>
        ))}
      </div>
      {tab === "sessions" ? (
        <div className="space-y-2">
          {sessions.length === 0 && <div className="card text-sm text-slate-500">まだ学習記録がありません。</div>}
          {sessions.map((s) => (
            <div key={s.id} className="card flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {s.config.title}
                  {s.status === "in_progress" && <span className="chip bg-amber-100 text-amber-800 ml-2">進行中</span>}
                  {s.status === "abandoned" && <span className="chip bg-slate-100 text-slate-600 ml-2">中止</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {formatDate(s.startedAt)}・{formatDuration(s.elapsedSec)}・{s.questionIds.length}問
                  {s.config.subjects.length > 0 && `・${s.config.subjects.map((id) => SUBJECTS.find((x) => x.id === id)?.shortName).join("/")}`}
                </div>
              </div>
              <div className="text-sm font-bold shrink-0">{s.result ? (s.result.maxScore > 0 ? `${s.result.score}/${s.result.maxScore}` : pct(s.result.answered ? s.result.correct / s.result.answered : null)) : ""}</div>
              {s.status === "completed" ? (
                <Link to={`/session/${s.id}/result`} className="btn-secondary text-xs py-1 shrink-0">
                  詳細
                </Link>
              ) : s.status === "in_progress" ? (
                <Link to={`/session/${s.id}`} className="btn-primary text-xs py-1 shrink-0">
                  再開
                </Link>
              ) : (
                <button className="btn-ghost text-xs text-red-700 shrink-0" onClick={() => deleteSession(s.id)}>
                  削除
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {essays.length === 0 && <div className="card text-sm text-slate-500">論述の答案はまだありません。</div>}
          {essays.map((a) => {
            const q = getQuestion(a.questionId);
            if (!q || (q.kind !== "mini" && q.kind !== "essay")) return null;
            const s = attemptScore(a);
            const isOpen = open === a.id;
            const title = q.kind === "mini" ? q.q.question : q.q.title;
            return (
              <div key={a.id} className="card">
                <button className="w-full text-left flex items-center gap-2" onClick={() => setOpen(isOpen ? null : a.id)}>
                  <SubjectChip subject={q.topic.subject} small />
                  <KindChip kind={a.kind} />
                  <span className="flex-1 min-w-0 truncate text-sm">{title}</span>
                  <span className={`text-sm font-bold shrink-0 ${(accuracyOf(a) ?? 0) >= 0.7 ? "text-emerald-700" : "text-red-700"}`}>{s ? `${s.score}/${s.max}` : ""}</span>
                  <span className="text-xs text-slate-400 shrink-0">{formatDate(a.createdAt)}</span>
                </button>
                {isOpen && (
                  <div className="mt-3 space-y-2 text-sm">
                    {q.kind === "mini" ? (
                      <>
                        <div className="text-xs text-slate-500">自分の答案</div>
                        <p className="whitespace-pre-wrap bg-slate-50 rounded p-2">{(a.answer as { text?: string })?.text || "（無記入）"}</p>
                        <div className="text-xs text-slate-500">模範解答</div>
                        <p className="whitespace-pre-wrap">{q.q.modelAnswer}</p>
                      </>
                    ) : (
                      q.q.subQuestions.map((sq) => (
                        <div key={sq.label}>
                          <div className="font-semibold">
                            {sq.label} {sq.question}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">自分の答案</div>
                          <p className="whitespace-pre-wrap bg-slate-50 rounded p-2">{(a.answer as { subs?: Record<string, string> })?.subs?.[sq.label] || "（無記入）"}</p>
                          <div className="text-xs text-slate-500 mt-1">模範解答</div>
                          <p className="whitespace-pre-wrap">{sq.modelAnswer}</p>
                        </div>
                      ))
                    )}
                    {a.aiFeedback && (
                      <div className="rounded border border-indigo-200 bg-indigo-50/50 p-2">
                        <div className="font-semibold text-indigo-900 text-xs mb-1">AI 講評</div>
                        {"score" in a.aiFeedback && typeof a.aiFeedback.score === "number" ? (
                          <p className="whitespace-pre-wrap">{(a.aiFeedback as { feedback: string }).feedback}</p>
                        ) : (
                          Object.entries(a.aiFeedback as Record<string, { feedback: string }>).map(([k, f]) => (
                            <p key={k} className="whitespace-pre-wrap mb-1">
                              <span className="font-semibold">{k}:</span> {f.feedback}
                            </p>
                          ))
                        )}
                      </div>
                    )}
                    <div className="text-right">
                      <Link to={`/topics/${q.topic.id}`} className="text-xs text-brand underline">
                        {q.topic.title} のノートへ
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
