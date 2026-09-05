import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { api } from "../api/client";
import { Markdown } from "../components/Markdown";
import { Alert, formatDate, PageTitle } from "../components/ui";
import { db } from "../db/local";
import { useAuth } from "../hooks/useAuth";
import { useAttempts, useSettings, useTopicProgress } from "../hooks/useData";
import { saveSummary } from "../lib/repo";
import { missedPoints, weakItems } from "../lib/stats";
import { buildSummaryMarkdown, topicsInScope } from "../lib/summaryBuilder";

export function SummaryViewPage() {
  const { summaryId = "" } = useParams();
  const summary = useLiveQuery(() => db.summaries.get(summaryId), [summaryId], null);
  const { user, aiEnabled } = useAuth();
  const settings = useSettings();
  const attempts = useAttempts();
  const progress = useTopicProgress();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  useEffect(() => {
    if (summary) setDraft(summary.bodyMarkdown);
  }, [summary]);

  if (summary === null) return <div className="text-slate-500">読み込み中…</div>;
  if (!summary) return <div className="card">まとめが見つかりません。<Link to="/summaries" className="underline ml-2">一覧へ</Link></div>;

  const regenerate = async () => {
    const body = buildSummaryMarkdown({ scope: summary.scope, attempts, progress });
    await saveSummary({ ...summary, bodyMarkdown: body });
    setMsg({ kind: "success", text: "最新の学習履歴で再生成しました（手で追記した内容は上書きされます）。" });
  };

  const copy = async () => {
    const text = (summary.aiNotes ? `# AI 直前確認ポイント\n\n${summary.aiNotes}\n\n---\n\n` : "") + summary.bodyMarkdown;
    try {
      await navigator.clipboard.writeText(text);
      setMsg({ kind: "success", text: "Markdown をコピーしました。" });
    } catch {
      setMsg({ kind: "error", text: "コピーに失敗しました。" });
    }
  };

  const generateAi = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const topics = topicsInScope(summary.scope);
      const topicSet = new Set(topics.map((t) => t.id));
      const weak = weakItems(attempts, 0.7, 60).filter((w) => topicSet.has(w.attempt.topicId) && (w.attempt.kind === "mini" || w.attempt.kind === "essay"));
      const weakPoints = weak.flatMap((w) => {
        const s = w.attempt.maxScore ?? 0;
        return missedPoints(w.attempt).map((m) => ({ questionId: w.attempt.questionId, subLabel: m.subLabel, missedPoints: m.points, score: w.attempt.selfScore ?? 0, maxScore: s }));
      });
      const res = await api.summarize({ examDate: settings.examDate, topicIds: topics.map((t) => t.id).slice(0, 60), weakPoints: weakPoints.slice(0, 60), model: settings.aiModel || undefined });
      await saveSummary({ ...summary, aiNotes: res.markdown });
      setMsg({ kind: "success", text: "AI の直前確認ポイントを追加しました。" });
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="no-print">
        <div className="text-xs text-slate-500 mb-1">
          <Link to="/summaries" className="hover:underline">まとめノート</Link>
        </div>
        <PageTitle title={summary.title} subtitle={`更新 ${formatDate(summary.updatedAt)}`} />
        {msg && (
          <div className="mb-3">
            <Alert kind={msg.kind}>{msg.text}</Alert>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          <button className="btn-primary" onClick={() => window.print()}>
            印刷 / PDF 保存
          </button>
          <button className="btn-secondary" onClick={copy}>
            Markdown をコピー
          </button>
          <button className="btn-secondary" onClick={() => setEditing(!editing)}>
            {editing ? "編集をやめる" : "編集（メモ追記）"}
          </button>
          <button className="btn-secondary" onClick={regenerate}>
            最新履歴で再生成
          </button>
          <button className="btn-secondary bg-indigo-50 border-indigo-200 text-indigo-900" onClick={generateAi} disabled={busy || !user || !aiEnabled} title={!user ? "ログインが必要" : !aiEnabled ? "API キー未設定" : ""}>
            {busy ? "AI 生成中…" : summary.aiNotes ? "AI 直前ポイントを再生成" : "AI に直前確認ポイントを作らせる"}
          </button>
        </div>
      </div>
      {editing ? (
        <div className="card no-print">
          <textarea className="input min-h-[60vh] font-mono text-sm" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex justify-end gap-2 mt-2">
            <button className="btn-secondary" onClick={() => { setDraft(summary.bodyMarkdown); setEditing(false); }}>
              キャンセル
            </button>
            <button className="btn-primary" onClick={async () => { await saveSummary({ ...summary, bodyMarkdown: draft }); setEditing(false); }}>
              保存
            </button>
          </div>
        </div>
      ) : (
        <article className="card print:border-0 print:shadow-none print:p-0">
          <h1 className="hidden print:block text-2xl font-bold mb-4">{summary.title}</h1>
          {summary.aiNotes && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 mb-6">
              <div className="font-bold text-indigo-900 mb-2">AI 直前確認ポイント</div>
              <Markdown>{summary.aiNotes}</Markdown>
            </div>
          )}
          <Markdown>{summary.bodyMarkdown}</Markdown>
        </article>
      )}
    </div>
  );
}
