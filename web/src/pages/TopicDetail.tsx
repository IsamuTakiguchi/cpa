import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSubject, getTopic, KIND_LABELS, type QuestionKind, type SessionConfig } from "@cpa/shared";
import { Markdown } from "../components/Markdown";
import { KindChip, PageTitle, pct, SubjectChip } from "../components/ui";
import { useAttempts, useCardStates, useTopicProgress } from "../hooks/useData";
import { useStartSession } from "../hooks/useStartSession";
import { markNoteRead, updateTopicProgress } from "../lib/repo";
import { accuracyOf, latestAttemptByQuestion } from "../lib/stats";

type Tab = "note" | "cards" | "questions" | "memo";

export function TopicDetailPage() {
  const { topicId = "" } = useParams();
  const topic = getTopic(topicId);
  const subject = topic ? getSubject(topic.subject) : undefined;
  const [tab, setTab] = useState<Tab>("note");
  const attempts = useAttempts();
  const cards = useCardStates();
  const progress = useTopicProgress().find((p) => p.id === topicId);
  const start = useStartSession();
  const [memo, setMemo] = useState(progress?.memo ?? "");
  useEffect(() => setMemo(progress?.memo ?? ""), [progress?.memo]);
  useEffect(() => {
    if (topic && tab === "note") void markNoteRead(topic.id, topic.subject);
  }, [topic, tab]);

  if (!topic || !subject) return <div className="card">論点が見つかりません。</div>;
  const latest = latestAttemptByQuestion(attempts);
  const now = new Date();
  const dueCards = topic.cards.filter((c) => {
    const s = cards.find((x) => x.id === c.id);
    return !s || new Date(s.dueAt) <= now;
  }).length;

  const quick = (kinds: QuestionKind[], minutes: number, title: string) =>
    start({ preset: "topic", title: `${topic.title}: ${title}`, subjects: [topic.subject], topicIds: [topic.id], kinds, maxQuestions: 0, timeLimitMinutes: minutes, order: "topic", preferUnseen: false, examMode: false } satisfies SessionConfig);

  const rows: { kind: QuestionKind; id: string; title: string }[] = [
    ...topic.trueFalse.map((q) => ({ kind: "tf" as const, id: q.id, title: q.statement })),
    ...topic.shortAnswers.map((q) => ({ kind: "short" as const, id: q.id, title: q.question })),
    ...topic.miniEssays.map((q) => ({ kind: "mini" as const, id: q.id, title: q.question })),
    ...topic.calcs.map((q) => ({ kind: "calc" as const, id: q.id, title: q.title })),
    ...topic.essays.map((q) => ({ kind: "essay" as const, id: q.id, title: q.title })),
  ];

  return (
    <div>
      <div className="text-xs text-slate-500 mb-1 no-print">
        <Link to="/subjects" className="hover:underline">科目</Link> / <Link to={`/subjects/${subject.id}`} className="hover:underline">{subject.name}</Link>
      </div>
      <PageTitle
        title={`${topic.order}. ${topic.title}`}
        subtitle={topic.description}
        right={
          <button className={`btn-ghost text-xl ${progress?.bookmarked ? "text-amber-500" : "text-slate-300"}`} title="ブックマーク" onClick={() => updateTopicProgress(topic.id, topic.subject, { bookmarked: !progress?.bookmarked })}>
            ★
          </button>
        }
      />
      <div className="flex items-center gap-2 mb-3 flex-wrap no-print">
        <SubjectChip subject={topic.subject} />
        <button className="btn-secondary text-xs py-1" onClick={() => quick(["card"], 0, "カード")}>
          カード {dueCards > 0 ? `(復習 ${dueCards})` : `(${topic.cards.length})`}
        </button>
        <button className="btn-secondary text-xs py-1" onClick={() => quick(["tf", "short"], 0, "正誤・一問一答")}>
          正誤・一問一答
        </button>
        <button className="btn-secondary text-xs py-1" onClick={() => quick(["mini", "calc"], 0, "小論述・計算")}>
          小論述・計算
        </button>
        <button className="btn-primary text-xs py-1" onClick={() => quick(["card", "tf", "short", "mini", "calc"], 30, "集中30分")}>
          この論点で30分
        </button>
      </div>
      <div className="flex border-b border-slate-200 mb-4 no-print">
        {(["note", "cards", "questions", "memo"] as Tab[]).map((t) => (
          <button key={t} className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === t ? "border-brand text-brand font-semibold" : "border-transparent text-slate-500"}`} onClick={() => setTab(t)}>
            {{ note: "ノート", cards: `カード (${topic.cards.length})`, questions: `問題 (${rows.length})`, memo: "メモ" }[t]}
          </button>
        ))}
      </div>
      {tab === "note" && (
        <div className="card">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4 text-sm">
            <div className="font-semibold text-amber-900 mb-1">直前確認（結論）</div>
            <Markdown>{topic.summary}</Markdown>
          </div>
          <Markdown>{topic.note}</Markdown>
        </div>
      )}
      {tab === "cards" && (
        <div className="space-y-2">
          {topic.cards.map((c) => {
            const s = cards.find((x) => x.id === c.id);
            return (
              <details key={c.id} className="card">
                <summary className="cursor-pointer font-medium text-sm flex justify-between gap-2">
                  <span>{c.front}</span>
                  <span className="text-xs text-slate-400 shrink-0">{s ? `次回 ${s.dueAt.slice(5, 10)}` : "未学習"}</span>
                </summary>
                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{c.back}</p>
                {c.source && <div className="text-xs text-slate-500 mt-1">出典: {c.source}</div>}
              </details>
            );
          })}
        </div>
      )}
      {tab === "questions" && (
        <div className="space-y-2">
          {rows.map((r) => {
            const a = latest.get(r.id);
            const acc = a ? accuracyOf(a) : null;
            return (
              <div key={r.id} className="card flex items-center gap-3">
                <KindChip kind={r.kind} />
                <div className="flex-1 min-w-0 text-sm truncate">{r.title}</div>
                <div className={`text-xs shrink-0 ${acc === null ? "text-slate-400" : acc >= 0.7 ? "text-emerald-700" : "text-red-700"}`}>{a ? pct(acc) : "未"}</div>
                <button
                  className="btn-secondary text-xs py-1 shrink-0"
                  onClick={() => start({ preset: "single", title: `${topic.title}: ${KIND_LABELS[r.kind]}`, subjects: [topic.subject], topicIds: [topic.id], kinds: [r.kind], maxQuestions: 1, timeLimitMinutes: 0, order: "topic", preferUnseen: false, examMode: false })}
                >
                  解く
                </button>
              </div>
            );
          })}
        </div>
      )}
      {tab === "memo" && (
        <div className="card">
          <label className="label">自分のメモ（まとめノートに取り込めます）</label>
          <textarea className="input min-h-[200px]" value={memo} onChange={(e) => setMemo(e.target.value)} onBlur={() => updateTopicProgress(topic.id, topic.subject, { memo })} placeholder="覚え方、間違えやすい点、講師の指摘など" />
          <div className="mt-3">
            <label className="label">仕上がり度</label>
            <div className="flex gap-2">
              {["未着手", "一読", "演習中", "仕上がり"].map((l, i) => (
                <button key={l} className={`btn text-xs ${progress?.mastery === i ? "bg-brand text-white" : "bg-white border border-slate-300"}`} onClick={() => updateTopicProgress(topic.id, topic.subject, { mastery: i })}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
