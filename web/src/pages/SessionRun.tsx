import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getQuestion, KIND_LABELS } from "@cpa/shared";
import { Timer } from "../components/Timer";
import { KindChip, Modal, ProgressBar, SubjectChip } from "../components/ui";
import { QuestionView } from "../components/questions/QuestionView";
import type { AnswerResult } from "../components/questions/types";
import { db } from "../db/local";
import { useSession, useSettings } from "../hooks/useData";
import { abandonSession, computeResult, reviewCard, saveAttempt, updateSession } from "../lib/repo";
import type { Rating } from "../lib/srs";

export function SessionRunPage() {
  const { sessionId = "" } = useParams();
  const session = useSession(sessionId);
  const settings = useSettings();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const [qStart, setQStart] = useState(Date.now());
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [examTab, setExamTab] = useState(0);
  const [gradePhase, setGradePhase] = useState(false);
  const baseElapsed = useRef<number | null>(null);
  const mountedAt = useRef(Date.now());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 経過時間: セッションに保存済みの累積 + このマウント以降
  useEffect(() => {
    if (!session || baseElapsed.current !== null) return;
    baseElapsed.current = session.elapsedSec;
    mountedAt.current = Date.now();
  }, [session]);
  useEffect(() => {
    const t = setInterval(() => setElapsed((baseElapsed.current ?? 0) + (Date.now() - mountedAt.current) / 1000), 1000);
    return () => clearInterval(t);
  }, []);
  const currentElapsed = useCallback(() => (baseElapsed.current ?? 0) + (Date.now() - mountedAt.current) / 1000, []);

  // 定期的に経過時間を保存（中断・再開のため）
  useEffect(() => {
    if (!session || session.status !== "in_progress") return;
    const t = setInterval(() => {
      void db.sessions.update(session.id, { elapsedSec: Math.round(currentElapsed()) });
    }, 15000);
    return () => clearInterval(t);
  }, [session, currentElapsed]);

  useEffect(() => {
    if (session?.status === "completed") navigate(`/session/${session.id}/result`, { replace: true });
  }, [session, navigate]);

  if (session === null) return <div className="text-slate-500">読み込み中…</div>;
  if (!session) return <div className="card">セッションが見つかりません。<Link to="/" className="underline ml-2">ホームへ</Link></div>;
  if (session.status !== "in_progress") return null;

  const total = session.questionIds.length;
  const idx = Math.min(session.currentIndex, total - 1);
  const qid = session.questionIds[idx]!;
  const found = getQuestion(qid);
  const examMode = session.config.examMode;

  const saveDraft = (questionId: string, answer: unknown) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void db.sessions.get(session.id).then((s) => s && db.sessions.update(session.id, { drafts: { ...(s.drafts ?? {}), [questionId]: answer }, elapsedSec: Math.round(currentElapsed()) }));
    }, 500);
  };

  const finish = async (s: typeof session) => {
    const attempts = await db.attempts.where("sessionId").equals(s.id).toArray();
    const result = computeResult({ ...s, perQuestionSec: s.perQuestionSec ?? {} }, attempts);
    await updateSession(s, { status: "completed", endedAt: new Date().toISOString(), elapsedSec: Math.round(currentElapsed()), result, currentIndex: total });
    navigate(`/session/${s.id}/result`, { replace: true });
  };

  const onDone = async (questionId: string, r: AnswerResult) => {
    const sec = Math.round((Date.now() - qStart) / 1000);
    setQStart(Date.now());
    const f = getQuestion(questionId);
    if (f?.kind === "card") await reviewCard(questionId, f.topic.id, f.topic.subject, (r.answer as { rating: Rating }).rating);
    await saveAttempt({ sessionId: session.id, questionId, ...r, elapsedSec: sec });
    const latest = (await db.sessions.get(session.id)) ?? session;
    const perQuestionSec = { ...(latest.perQuestionSec ?? {}), [questionId]: sec };
    const nextIndex = latest.currentIndex + 1;
    if (nextIndex >= total) {
      await finish({ ...latest, perQuestionSec });
    } else {
      await updateSession(latest, { currentIndex: nextIndex, perQuestionSec, elapsedSec: Math.round(currentElapsed()) });
      window.scrollTo({ top: 0 });
    }
  };

  const header = (
    <div className="sticky top-12 md:top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-2 bg-slate-50/95 backdrop-blur border-b border-slate-200 no-print">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{session.config.title}</div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {found && <SubjectChip subject={found.topic.subject} small />}
            {found && <span className="truncate">{found.topic.title}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Timer elapsedSec={elapsed} limitMinutes={session.config.timeLimitMinutes} />
          <button className="btn-ghost text-xs" onClick={() => setConfirmQuit(true)}>
            中断
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <ProgressBar value={examMode && !gradePhase ? 0 : idx} max={total} className="flex-1" />
        <span className="text-xs text-slate-500 tabular-nums">
          {examMode && !gradePhase ? `大問 ${total}` : `${idx + 1} / ${total}`}
        </span>
      </div>
    </div>
  );

  const quitModal = (
    <Modal
      open={confirmQuit}
      onClose={() => setConfirmQuit(false)}
      title="中断しますか？"
      footer={
        <>
          <button className="btn-secondary" onClick={() => setConfirmQuit(false)}>
            続ける
          </button>
          <button className="btn-ghost text-red-700" onClick={async () => { await abandonSession(session); navigate("/"); }}>
            破棄して終了
          </button>
          <button className="btn-primary" onClick={async () => { await updateSession((await db.sessions.get(session.id)) ?? session, { elapsedSec: Math.round(currentElapsed()) }); navigate("/"); }}>
            保存して中断（後で再開）
          </button>
        </>
      }
    >
      <p className="text-slate-600">「保存して中断」すると、ホームの「続きから」で再開できます。</p>
    </Modal>
  );

  // ---- 本試験形式: 解答フェーズ（全大問をタブで切替、一括提出） ----
  if (examMode && !gradePhase) {
    const cur = session.questionIds[examTab]!;
    return (
      <div>
        {header}
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {session.questionIds.map((id, i) => {
            const q = getQuestion(id);
            const hasDraft = !!session.drafts?.[id];
            return (
              <button key={id} className={`btn text-xs py-1.5 shrink-0 ${i === examTab ? "bg-brand text-white" : "bg-white border border-slate-300"}`} onClick={() => setExamTab(i)}>
                第{i + 1}問 {q ? KIND_LABELS[q.kind] : ""} {hasDraft ? "●" : "○"}
              </button>
            );
          })}
        </div>
        <div className="mt-3" key={cur}>
          <QuestionView questionId={cur} phase="answer" initialAnswer={session.drafts?.[cur]} onDraft={(a) => saveDraft(cur, a)} onDone={() => undefined} />
        </div>
        <div className="mt-6 flex gap-2">
          {examTab < total - 1 ? (
            <button className="btn-secondary flex-1" onClick={() => { setExamTab(examTab + 1); window.scrollTo({ top: 0 }); }}>
              次の大問へ
            </button>
          ) : null}
          <button className="btn-primary flex-1" onClick={() => setConfirmSubmit(true)}>
            全問を提出して採点へ
          </button>
        </div>
        <Modal
          open={confirmSubmit}
          onClose={() => setConfirmSubmit(false)}
          title="提出しますか？"
          footer={
            <>
              <button className="btn-secondary" onClick={() => setConfirmSubmit(false)}>
                戻る
              </button>
              <button className="btn-primary" onClick={async () => { setConfirmSubmit(false); await db.sessions.update(session.id, { elapsedSec: Math.round(currentElapsed()), currentIndex: 0 }); setQStart(Date.now()); setGradePhase(true); window.scrollTo({ top: 0 }); }}>
                提出する
              </button>
            </>
          }
        >
          <p className="text-slate-600">提出後は答案を編集できません。大問ごとに模範解答と採点ポイントで採点します。</p>
          <ul className="mt-2 text-sm list-disc pl-5">
            {session.questionIds.map((id, i) => (
              <li key={id}>
                第{i + 1}問: {session.drafts?.[id] ? "解答あり" : "未解答"}
              </li>
            ))}
          </ul>
        </Modal>
        {quitModal}
      </div>
    );
  }

  // ---- 通常演習 / 本試験形式の採点フェーズ ----
  return (
    <div>
      {header}
      <div className="mt-3 flex items-center gap-2">
        {found && <KindChip kind={found.kind} />}
        {examMode && <span className="text-xs text-slate-500">採点フェーズ: 第{idx + 1}問</span>}
      </div>
      <div className="mt-2" key={qid + (gradePhase ? "-g" : "")}>
        <QuestionView questionId={qid} phase={examMode ? "grade" : "full"} initialAnswer={examMode ? session.drafts?.[qid] : undefined} onDone={(r) => onDone(qid, r)} aiModel={settings.aiModel || undefined} />
      </div>
      {quitModal}
    </div>
  );
}
