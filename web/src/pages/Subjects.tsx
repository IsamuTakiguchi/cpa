import { Link, useParams } from "react-router-dom";
import { SUBJECTS, topicQuestionCount } from "@cpa/shared";
import { useAttempts, useCardStates, useTopicProgress } from "../hooks/useData";
import { latestAttemptByQuestion, accuracyOf } from "../lib/stats";
import { PageTitle, pct, ProgressBar, SubjectChip } from "../components/ui";

const MASTERY = ["未着手", "一読", "演習中", "仕上がり"];

export function SubjectsPage() {
  const { subjectId } = useParams();
  const attempts = useAttempts();
  const cards = useCardStates();
  const progress = useTopicProgress();
  const latest = latestAttemptByQuestion(attempts);
  const pmap = new Map(progress.map((p) => [p.id, p]));
  const subjects = subjectId ? SUBJECTS.filter((s) => s.id === subjectId) : SUBJECTS;
  const now = new Date();
  return (
    <div>
      <PageTitle title={subjectId ? (subjects[0]?.name ?? "科目") : "科目・論点"} subtitle={subjectId ? subjects[0]?.examNote : "論点を選んでインプット（ノート）と演習へ"} />
      {!subjectId && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {SUBJECTS.map((s) => (
            <Link key={s.id} to={`/subjects/${s.id}`} className="chip text-white shrink-0 py-1.5 px-3" style={{ backgroundColor: s.color }}>
              {s.name}
            </Link>
          ))}
        </div>
      )}
      <div className="space-y-6">
        {subjects.map((s) => (
          <section key={s.id}>
            {!subjectId && (
              <h2 className="font-bold mb-2 flex items-center gap-2">
                <SubjectChip subject={s.id} /> {s.name} <span className="text-xs text-slate-500 font-normal">{s.examNote}</span>
              </h2>
            )}
            <div className="space-y-2">
              {s.topics.map((t) => {
                const counts = topicQuestionCount(t);
                const total = Object.values(counts).reduce((a, b) => a + b, 0);
                const ids = [...t.cards, ...t.trueFalse, ...t.shortAnswers, ...t.miniEssays, ...t.essays, ...t.calcs].map((q) => q.id);
                const seen = ids.filter((id) => latest.has(id));
                const accs = seen.map((id) => accuracyOf(latest.get(id)!)).filter((v): v is number => v !== null);
                const acc = accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : null;
                const p = pmap.get(t.id);
                const due = cards.filter((c) => c.topicId === t.id && new Date(c.dueAt) <= now).length;
                return (
                  <Link key={t.id} to={`/topics/${t.id}`} className="card block hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold">
                          {t.order}. {t.title} {p?.bookmarked && <span className="text-amber-500">★</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 leading-5">{t.description}</div>
                      </div>
                      <span className={`chip shrink-0 ${p?.mastery === 3 ? "bg-emerald-100 text-emerald-800" : p?.mastery ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"}`}>{MASTERY[p?.mastery ?? 0]}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <ProgressBar value={seen.length} max={total} color={s.color} className="flex-1" />
                      <span>
                        {seen.length}/{total}問
                      </span>
                      <span>正答率 {pct(acc)}</span>
                      {due > 0 && <span className="chip bg-amber-100 text-amber-800">復習 {due}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
