import { Link } from "react-router-dom";
import { SUBJECTS, type QuestionKind } from "@cpa/shared";
import { KindChip, PageTitle, pct, SubjectChip } from "../components/ui";
import { useAttempts, useCardStates } from "../hooks/useData";
import { useStartSession } from "../hooks/useStartSession";
import { weakItems } from "../lib/stats";

export function ReviewPage() {
  const attempts = useAttempts();
  const cards = useCardStates();
  const start = useStartSession();
  const now = new Date();
  const due = cards.filter((c) => new Date(c.dueAt) <= now);
  const dueBySubject = SUBJECTS.map((s) => ({ s, n: due.filter((c) => c.subject === s.id).length })).filter((x) => x.n > 0);
  const weak = weakItems(attempts, 0.7, 40);
  const upcoming = cards.filter((c) => new Date(c.dueAt) > now).sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1)).slice(0, 5);

  return (
    <div className="space-y-5">
      <PageTitle title="復習" subtitle="期限が来たカードと、得点の低かった問題" />
      <section className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">復習期限のカード</div>
            <div className="text-sm text-slate-500">{due.length} 枚</div>
          </div>
          <button className="btn-primary" disabled={due.length === 0} onClick={() => start({ preset: "review-cards", title: "期限カードの復習", subjects: [], topicIds: [], kinds: ["card"], maxQuestions: Math.min(due.length, 50), timeLimitMinutes: 0, order: "weak", preferUnseen: false, examMode: false })}>
            復習を始める
          </button>
        </div>
        {dueBySubject.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {dueBySubject.map(({ s, n }) => (
              <button key={s.id} className="chip py-1.5 px-3 text-white" style={{ backgroundColor: s.color }} onClick={() => start({ preset: "review-cards", title: `${s.name} カード復習`, subjects: [s.id], topicIds: [], kinds: ["card"], maxQuestions: Math.min(n, 50), timeLimitMinutes: 0, order: "weak", preferUnseen: false, examMode: false })}>
                {s.shortName} {n}
              </button>
            ))}
          </div>
        )}
        {due.length === 0 && upcoming.length > 0 && <div className="text-xs text-slate-500 mt-2">次の期限: {new Date(upcoming[0]!.dueAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit" })}</div>}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold">得点の低かった問題（{weak.length}）</h2>
          {weak.length > 0 && (
            <button className="btn-secondary text-xs" onClick={() => start({ preset: "weak", title: "弱点補強", subjects: [], topicIds: [], kinds: [...new Set(weak.map((w) => w.attempt.kind as QuestionKind))], maxQuestions: Math.min(weak.length, 20), timeLimitMinutes: 0, order: "weak", preferUnseen: false, examMode: false })}>
              まとめて再挑戦
            </button>
          )}
        </div>
        {weak.length === 0 ? (
          <div className="card text-sm text-slate-500">正答率70%未満の問題はありません。</div>
        ) : (
          <div className="space-y-1.5">
            {weak.map((w) => (
              <div key={w.attempt.questionId} className="card py-2 flex items-center gap-2 text-sm">
                <SubjectChip subject={w.subject} small />
                <KindChip kind={w.attempt.kind} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{w.title}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {w.topicTitle}
                    {w.missed.length > 0 && ` ／ 落とした点: ${w.missed.flatMap((m) => m.points).join("・")}`}
                  </div>
                </div>
                <span className="text-red-700 font-semibold shrink-0">{pct(w.accuracy)}</span>
                <button className="btn-secondary text-xs py-1 shrink-0" onClick={() => start({ preset: "single", title: "再挑戦", subjects: [], topicIds: [w.attempt.topicId], kinds: [w.attempt.kind as QuestionKind], maxQuestions: 1, timeLimitMinutes: 0, order: "weak", preferUnseen: false, examMode: false })}>
                  解く
                </button>
                <Link to={`/topics/${w.attempt.topicId}`} className="text-xs text-brand underline shrink-0">
                  ノート
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
