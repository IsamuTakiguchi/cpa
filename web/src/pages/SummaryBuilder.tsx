import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SUBJECTS, type SubjectId, type SummaryScope } from "@cpa/shared";
import { Alert, PageTitle } from "../components/ui";
import { useAttempts, useTopicProgress } from "../hooks/useData";
import { saveSummary } from "../lib/repo";
import { buildSummaryMarkdown, DEFAULT_SCOPE, topicsInScope } from "../lib/summaryBuilder";

export function SummaryBuilderPage() {
  const navigate = useNavigate();
  const attempts = useAttempts();
  const progress = useTopicProgress();
  const [scope, setScope] = useState<SummaryScope>(DEFAULT_SCOPE);
  const [title, setTitle] = useState("");
  const [onlyWeak, setOnlyWeak] = useState(false);
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const effectiveScope = useMemo<SummaryScope>(() => {
    let topics = topicsInScope(scope);
    if (onlyBookmarked) {
      const bm = new Set(progress.filter((p) => p.bookmarked).map((p) => p.id));
      topics = topics.filter((t) => bm.has(t.id));
    }
    if (onlyWeak) {
      const weakTopics = new Set<string>();
      const latest = new Map<string, { acc: number | null }>();
      for (const a of attempts) {
        const prev = latest.get(a.questionId);
        if (prev) continue;
        const acc = a.maxScore ? (a.selfScore ?? 0) / a.maxScore : a.isCorrect === null ? null : a.isCorrect ? 1 : 0;
        latest.set(a.questionId, { acc });
        if (acc !== null && acc < 0.7) weakTopics.add(a.topicId);
      }
      topics = topics.filter((t) => weakTopics.has(t.id));
    }
    return { ...scope, topicIds: onlyWeak || onlyBookmarked ? topics.map((t) => t.id) : scope.topicIds };
  }, [scope, onlyWeak, onlyBookmarked, attempts, progress]);

  const preview = useMemo(() => buildSummaryMarkdown({ scope: effectiveScope, attempts, progress }), [effectiveScope, attempts, progress]);
  const topicCount = topicsInScope(effectiveScope).length;
  const visibleSubjects = SUBJECTS.filter((s) => scope.subjects.length === 0 || scope.subjects.includes(s.id));

  const create = async () => {
    if (topicCount === 0) {
      setError("対象の論点がありません。");
      return;
    }
    const t = title.trim() || `${scope.subjects.length ? scope.subjects.map((id) => SUBJECTS.find((x) => x.id === id)?.shortName).join("・") : "全科目"} まとめ ${new Date().toLocaleDateString("ja-JP")}`;
    const s = await saveSummary({ title: t, scope: effectiveScope, bodyMarkdown: preview, aiNotes: null });
    navigate(`/summaries/${s.id}`);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <PageTitle title="まとめノートを作る" subtitle="範囲と素材を選ぶと Markdown のまとめが生成されます。後から自分のメモを追記できます。" />
      {error && <Alert kind="warn">{error}</Alert>}
      <section className="card space-y-4">
        <div>
          <label className="label">タイトル</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: 直前1週間 監査論" />
        </div>
        <div>
          <label className="label">科目（未選択＝全科目）</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <button key={s.id} className={`chip py-1.5 px-3 border ${scope.subjects.includes(s.id) ? "text-white" : "bg-white text-slate-700"}`} style={scope.subjects.includes(s.id) ? { backgroundColor: s.color, borderColor: s.color } : {}} onClick={() => setScope({ ...scope, subjects: toggle(scope.subjects, s.id) as SubjectId[], topicIds: [] })}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">論点（未選択＝すべて）</label>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-2">
            {visibleSubjects.map((s) => (
              <div key={s.id}>
                <div className="text-xs font-semibold text-slate-500 mb-1">{s.name}</div>
                <div className="flex flex-wrap gap-1">
                  {s.topics.map((t) => (
                    <button key={t.id} className={`chip border ${scope.topicIds.includes(t.id) ? "bg-brand text-white border-brand" : "bg-white text-slate-700"}`} onClick={() => setScope({ ...scope, topicIds: toggle(scope.topicIds, t.id) })}>
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={onlyWeak} onChange={(e) => setOnlyWeak(e.target.checked)} /> 弱点のある論点だけ
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={onlyBookmarked} onChange={(e) => setOnlyBookmarked(e.target.checked)} /> ブックマークした論点だけ
            </label>
          </div>
        </div>
        <div>
          <label className="label">素材</label>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-24">要点ノート</span>
              <select className="input max-w-xs" value={scope.includeNotes} onChange={(e) => setScope({ ...scope, includeNotes: e.target.value as SummaryScope["includeNotes"] })}>
                <option value="summary">結論だけ（圧縮版）</option>
                <option value="full">全文</option>
                <option value="none">含めない</option>
              </select>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.includeCards} onChange={(e) => setScope({ ...scope, includeCards: e.target.checked })} /> 暗記カード一覧（表）
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.includeWeakQuestions} onChange={(e) => setScope({ ...scope, includeWeakQuestions: e.target.checked })} /> 間違えた・得点の低かった問題と採点ポイント
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.includeMyAnswers} onChange={(e) => setScope({ ...scope, includeMyAnswers: e.target.checked })} /> 自分の過去答案と AI 講評
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={scope.includeMemos} onChange={(e) => setScope({ ...scope, includeMemos: e.target.checked })} /> 論点ごとの自分メモ・ブックマーク
            </label>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm flex items-center justify-between">
          <div>
            対象 <span className="font-bold">{topicCount} 論点</span>　約{Math.max(1, Math.round(preview.length / 1200))}ページ（{preview.length.toLocaleString()}字）
          </div>
          <button className="btn-primary" onClick={create} disabled={topicCount === 0}>
            生成して保存
          </button>
        </div>
      </section>
    </div>
  );
}
