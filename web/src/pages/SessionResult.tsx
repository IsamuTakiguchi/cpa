import { Link, useParams } from "react-router-dom";
import { getQuestion, KIND_LABELS } from "@cpa/shared";
import { useLiveQuery } from "dexie-react-hooks";
import { formatDuration, KindChip, PageTitle, pct } from "../components/ui";
import { db } from "../db/local";
import { useSession } from "../hooks/useData";
import { useStartSession } from "../hooks/useStartSession";
import { accuracyOf } from "../lib/stats";
import { attemptScore } from "../lib/repo";

export function SessionResultPage() {
  const { sessionId = "" } = useParams();
  const session = useSession(sessionId);
  const attempts = useLiveQuery(() => db.attempts.where("sessionId").equals(sessionId).toArray(), [sessionId], []);
  const start = useStartSession();
  if (!session) return <div className="text-slate-500">読み込み中…</div>;
  const r = session.result;
  const wrong = attempts.filter((a) => {
    const acc = accuracyOf(a);
    return acc !== null && acc < 0.7;
  });
  return (
    <div className="space-y-4">
      <PageTitle title="結果" subtitle={session.config.title} />
      <div className="card grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs text-slate-500">解答数</div>
          <div className="text-2xl font-bold">
            {r?.answered ?? attempts.length}
            <span className="text-sm font-normal text-slate-400">/{session.questionIds.length}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">{r && r.maxScore > 0 ? "得点" : "正答率"}</div>
          <div className="text-2xl font-bold">{r && r.maxScore > 0 ? `${r.score}/${r.maxScore}` : pct(r && r.answered ? r.correct / r.answered : null)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">所要時間</div>
          <div className="text-2xl font-bold">{formatDuration(session.elapsedSec)}</div>
        </div>
      </div>
      {r && Object.keys(r.perKind).length > 1 && (
        <div className="card">
          <div className="text-sm font-semibold mb-2">形式別</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {Object.entries(r.perKind).map(([k, v]) => (
              <div key={k} className="rounded bg-slate-50 p-2 flex justify-between">
                <span>{KIND_LABELS[k as keyof typeof KIND_LABELS] ?? k}</span>
                <span className="font-semibold">{v.maxScore > 0 ? `${v.score}/${v.maxScore}点` : `${v.correct}/${v.count}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="text-sm font-semibold mb-2">問題ごと</div>
        <div className="space-y-1.5">
          {session.questionIds.map((id, i) => {
            const a = attempts.find((x) => x.questionId === id);
            const q = getQuestion(id);
            const acc = a ? accuracyOf(a) : null;
            const s = a ? attemptScore(a) : null;
            const sec = session.perQuestionSec?.[id];
            const title = q ? (q.kind === "tf" ? q.q.statement : q.kind === "short" ? q.q.question : q.kind === "mini" ? q.q.question : q.kind === "essay" ? q.q.title : q.kind === "calc" ? q.q.title : q.q.front) : id;
            return (
              <div key={id} className="card py-2 flex items-center gap-2 text-sm">
                <span className="text-xs text-slate-400 w-5">{i + 1}</span>
                {q && <KindChip kind={q.kind} />}
                <span className="flex-1 min-w-0 truncate">{title}</span>
                {sec !== undefined && <span className="text-xs text-slate-400 shrink-0">{formatDuration(sec)}</span>}
                <span className={`shrink-0 font-semibold ${acc === null ? "text-slate-400" : acc >= 0.7 ? "text-emerald-700" : "text-red-700"}`}>{!a ? "未" : s ? `${s.score}/${s.max}` : acc !== null && acc >= 1 ? "○" : "×"}</span>
                {q && <Link to={`/topics/${q.topic.id}`} className="text-xs text-brand underline shrink-0">ノート</Link>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {wrong.length > 0 && (
          <button className="btn-primary" onClick={() => start({ ...session.config, preset: "retry", title: `再挑戦: ${session.config.title}`, examMode: false, topicIds: [], subjects: [], kinds: [...new Set(wrong.map((a) => a.kind))], maxQuestions: wrong.length, timeLimitMinutes: 0, order: "weak", preferUnseen: false })}>
            間違えた {wrong.length} 問に再挑戦
          </button>
        )}
        <button className="btn-secondary" onClick={() => start({ ...session.config, title: session.config.title })}>
          同じ条件でもう一度
        </button>
        <Link to="/" className="btn-ghost">
          ホームへ
        </Link>
      </div>
    </div>
  );
}
