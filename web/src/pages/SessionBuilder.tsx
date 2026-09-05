import { useMemo, useState } from "react";
import { EXAM_FORMATS, KIND_LABELS, KIND_ORDER, SUBJECTS, type QuestionKind, type SessionConfig, type SubjectId } from "@cpa/shared";
import { Alert, PageTitle } from "../components/ui";
import { useAttempts, useCardStates } from "../hooks/useData";
import { useStartSession } from "../hooks/useStartSession";
import { examPreset, planSession, PRESETS } from "../lib/sessionPlanner";
import { buildHistory } from "../lib/stats";

export function SessionBuilderPage() {
  const start = useStartSession();
  const attempts = useAttempts();
  const cards = useCardStates();
  const [subjects, setSubjects] = useState<SubjectId[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [kinds, setKinds] = useState<QuestionKind[]>(["card", "tf", "short"]);
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState(0);
  const [order, setOrder] = useState<SessionConfig["order"]>("weak");
  const [preferUnseen, setPreferUnseen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config: SessionConfig = useMemo(
    () => ({ preset: "custom", title: "カスタム出題", subjects, topicIds, kinds, maxQuestions, timeLimitMinutes: timeLimit, order, preferUnseen, examMode: false }),
    [subjects, topicIds, kinds, maxQuestions, timeLimit, order, preferUnseen],
  );
  const history = useMemo(() => buildHistory(attempts, cards), [attempts, cards]);
  const preview = useMemo(() => planSession(config, history, () => 0.5), [config, history]);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const visibleTopics = SUBJECTS.filter((s) => subjects.length === 0 || subjects.includes(s.id));

  const go = async (c: SessionConfig) => {
    setError(null);
    const id = await start(c);
    if (!id) setError("条件に合う問題がありません。");
  };

  return (
    <div className="space-y-5">
      <PageTitle title="出題を作る" subtitle="短時間の小問から本試験形式まで、形式・問題数・時間を自由に" />
      {error && <Alert kind="warn">{error}</Alert>}

      <section>
        <h2 className="font-bold mb-2">プリセット</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} className="card text-left hover:shadow-md" onClick={() => go(p.build(subjects.length ? subjects : undefined))}>
              <div className="font-semibold text-sm">{p.title}</div>
              <div className="text-xs text-slate-500 mt-1">{p.description}</div>
            </button>
          ))}
        </div>
        <h3 className="font-semibold text-sm mt-3 mb-1">本試験形式（大問を通しで解答→一括提出）</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {EXAM_FORMATS.map((f) => (
            <button key={f.subject} className="card text-left hover:shadow-md border-l-4" style={{ borderLeftColor: SUBJECTS.find((s) => s.id === f.subject)!.color }} onClick={() => go(examPreset(f.subject))}>
              <div className="font-semibold text-sm">{f.label}</div>
              <div className="text-xs text-slate-500 mt-1">
                {f.minutes}分・大問{f.essayCount + f.calcCount}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold">カスタム</h2>
        <div>
          <label className="label">科目（未選択＝全科目）</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <button key={s.id} className={`chip py-1.5 px-3 border ${subjects.includes(s.id) ? "text-white" : "bg-white text-slate-700"}`} style={subjects.includes(s.id) ? { backgroundColor: s.color, borderColor: s.color } : {}} onClick={() => { setSubjects(toggle(subjects, s.id)); setTopicIds([]); }}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">論点（未選択＝すべて）</label>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-2">
            {visibleTopics.map((s) => (
              <div key={s.id}>
                <div className="text-xs font-semibold text-slate-500 mb-1">{s.name}</div>
                <div className="flex flex-wrap gap-1">
                  {s.topics.map((t) => (
                    <button key={t.id} className={`chip border ${topicIds.includes(t.id) ? "bg-brand text-white border-brand" : "bg-white text-slate-700"}`} onClick={() => setTopicIds(toggle(topicIds, t.id))}>
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="label">形式（複数可）</label>
          <div className="flex flex-wrap gap-2">
            {KIND_ORDER.map((k) => (
              <button key={k} className={`chip py-1.5 px-3 border ${kinds.includes(k) ? "bg-brand text-white border-brand" : "bg-white text-slate-700"}`} onClick={() => setKinds(toggle(kinds, k))}>
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">問題数（0＝時間で決める）</label>
            <input className="input" type="number" min={0} max={200} value={maxQuestions} onChange={(e) => setMaxQuestions(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <label className="label">制限時間（分、0＝なし）</label>
            <input className="input" type="number" min={0} max={300} step={5} value={timeLimit} onChange={(e) => setTimeLimit(Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">出題順</label>
            <select className="input" value={order} onChange={(e) => setOrder(e.target.value as SessionConfig["order"])}>
              <option value="weak">弱点・復習期限優先</option>
              <option value="random">ランダム</option>
              <option value="topic">論点順</option>
            </select>
          </div>
          <label className="flex items-center gap-2 mt-6 text-sm">
            <input type="checkbox" checked={preferUnseen} onChange={(e) => setPreferUnseen(e.target.checked)} />
            未出題の問題を優先
          </label>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm flex items-center justify-between">
          <div>
            出題予定: <span className="font-bold">{preview.questionIds.length} 問</span>　所要目安 約{preview.estimatedMinutes}分
          </div>
          <button className="btn-primary" disabled={preview.questionIds.length === 0 || kinds.length === 0} onClick={() => go(config)}>
            開始
          </button>
        </div>
      </section>
    </div>
  );
}
