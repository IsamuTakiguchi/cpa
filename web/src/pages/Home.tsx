import { useState } from "react";
import { Link } from "react-router-dom";
import { EXAM_FORMATS, SUBJECTS, type SubjectId } from "@cpa/shared";
import { useAttempts, useCardStates, useSessions, useSettings, useTopicProgress } from "../hooks/useData";
import { useStartSession } from "../hooks/useStartSession";
import { useAuth } from "../hooks/useAuth";
import { examPreset, PRESETS, type Preset } from "../lib/sessionPlanner";
import { daysUntil, dueCardCount, studyMinutesByDay, subjectStats } from "../lib/stats";
import { Alert, formatDate, Modal, pct, ProgressBar, SubjectChip } from "../components/ui";
import { abandonSession } from "../lib/repo";
import { formatJpDate, pendingChecklist, upcomingEvents } from "../lib/examSchedule";

export function HomePage() {
  const settings = useSettings();
  const attempts = useAttempts();
  const cards = useCardStates();
  const progress = useTopicProgress();
  const sessions = useSessions();
  const { user } = useAuth();
  const start = useStartSession();
  const [picking, setPicking] = useState<Preset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days = daysUntil(settings.examDate);
  const due = dueCardCount(cards);
  const stats = subjectStats(attempts, cards, progress);
  const inProgress = sessions.filter((s) => s.status === "in_progress").sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const recent = sessions.filter((s) => s.status === "completed").sort((a, b) => (a.endedAt! < b.endedAt! ? 1 : -1)).slice(0, 5);
  const minutes = studyMinutesByDay(sessions, 14);
  const todayMin = minutes[minutes.length - 1]?.minutes ?? 0;
  const lastExport = settings.lastExportAt ? (Date.now() - new Date(settings.lastExportAt).getTime()) / 86400000 : null;
  const track = settings.examTrack ?? "";
  const upcoming = upcomingEvents(track, new Date(), 30).filter((e) => e.kind === "deadline" || e.kind === "exam");
  const pending = pendingChecklist(track, settings.procedureChecks, new Date(), 30);

  const run = async (preset: Preset, subjects?: SubjectId[]) => {
    setPicking(null);
    setError(null);
    const id = await start(preset.build(subjects));
    if (!id) setError("条件に合う問題がありません。科目や形式を変えてください。");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-br from-brand to-brand-light text-white p-5 shadow">
        <div className="text-sm text-white/80">2027年 論文式試験（{settings.examDate.replace(/-/g, "/")}）まで</div>
        <div className="text-4xl font-bold mt-1">
          {days > 0 ? `${days} 日` : days === 0 ? "本日" : "終了"}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 text-center">
          <div className="rounded-lg bg-white/10 py-2">
            <div className="text-xs text-white/70">今日の復習カード</div>
            <div className="text-xl font-bold">{due}</div>
          </div>
          <div className="rounded-lg bg-white/10 py-2">
            <div className="text-xs text-white/70">今日の学習</div>
            <div className="text-xl font-bold">
              {todayMin}
              <span className="text-xs font-normal">/{settings.dailyGoalMinutes}分</span>
            </div>
          </div>
          <div className="rounded-lg bg-white/10 py-2">
            <div className="text-xs text-white/70">解答数</div>
            <div className="text-xl font-bold">{attempts.length}</div>
          </div>
        </div>
      </section>

      {error && <Alert kind="warn">{error}</Alert>}
      {(upcoming.length > 0 || pending.length > 0) && (
        <section className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="font-bold text-red-800">手続きの期限が近づいています</h2>
            <Link to="/procedures" className="text-sm text-red-800 underline">
              手続き一覧へ
            </Link>
          </div>
          <ul className="space-y-1 text-sm">
            {upcoming.slice(0, 3).map((e) => (
              <li key={e.id} className="flex justify-between gap-2">
                <span>
                  {e.title}
                  <span className="text-slate-500">（{formatJpDate(e.endDate ?? e.date)}{e.time ? ` ${e.time}` : ""}）</span>
                </span>
                <span className="font-bold text-red-700 shrink-0">{e.days === 0 ? "今日" : `あと${e.days}日`}</span>
              </li>
            ))}
            {pending.slice(0, 3).map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span>☐ {c.title}</span>
                <span className={`font-bold shrink-0 ${c.days < 0 ? "text-red-700" : "text-amber-700"}`}>{c.days < 0 ? "期限超過" : c.days === 0 ? "今日" : `あと${c.days}日`}</span>
              </li>
            ))}
          </ul>
          {!track && (
            <p className="text-xs text-slate-600 mt-2">
              <Link to="/procedures" className="underline">受験区分</Link>を設定すると、自分に関係する期限だけが表示されます。
            </p>
          )}
        </section>
      )}
      {!user && (
        <Alert kind="info">
          ゲストモードです。データはこの端末に保存されます。PC とスマホで同期するには <Link to="/auth" className="underline font-medium">ログイン</Link> してください。
        </Alert>
      )}
      {lastExport !== null && lastExport > 7 && (
        <Alert kind="warn">
          最後のバックアップ書き出しから {Math.floor(lastExport)} 日経過しています。<Link to="/settings" className="underline font-medium">設定</Link> から書き出しておきましょう。
        </Alert>
      )}
      {lastExport === null && attempts.length > 20 && (
        <Alert kind="info">
          学習データが溜まってきました。<Link to="/settings" className="underline font-medium">設定</Link> から JSON にバックアップできます。
        </Alert>
      )}

      {inProgress.length > 0 && (
        <section>
          <h2 className="font-bold mb-2">続きから</h2>
          <div className="space-y-2">
            {inProgress.map((s) => (
              <div key={s.id} className="card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.config.title}</div>
                  <div className="text-xs text-slate-500">
                    {s.currentIndex} / {s.questionIds.length} 問　{formatDate(s.startedAt)} 開始
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="btn-ghost text-xs" onClick={() => abandonSession(s)}>
                    破棄
                  </button>
                  <Link to={`/session/${s.id}`} className="btn-primary text-xs">
                    再開
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-bold mb-2">すぐ始める</h2>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} className="card text-left hover:shadow-md transition" onClick={() => setPicking(p)}>
              <div className="font-semibold">{p.title}</div>
              <div className="text-xs text-slate-500 mt-1 leading-5">{p.description}</div>
              <div className="text-xs text-brand mt-2">約{p.minutes}分</div>
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
          {EXAM_FORMATS.map((f) => (
            <button
              key={f.subject}
              className="card text-left hover:shadow-md transition border-l-4"
              style={{ borderLeftColor: SUBJECTS.find((s) => s.id === f.subject)!.color }}
              onClick={async () => {
                setError(null);
                const id = await start(examPreset(f.subject));
                if (!id) setError("本試験形式の問題が不足しています。");
              }}
            >
              <div className="text-xs text-slate-500">本試験形式</div>
              <div className="font-semibold text-sm">{f.label}</div>
              <div className="text-xs text-slate-500 mt-1">
                {f.minutes}分・大問{f.essayCount + f.calcCount}
              </div>
            </button>
          ))}
        </div>
        <div className="text-right mt-2">
          <Link to="/session/new" className="text-sm text-brand underline">
            条件を細かく指定して出題 →
          </Link>
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-2">科目別の進捗 <span className="text-xs font-normal text-slate-500">（科目をタップすると体系マップ）</span></h2>
        <div className="space-y-2">
          {stats.map((s) => (
            <Link key={s.subject} to={`/subjects/${s.subject}`} className="card flex items-center gap-3 hover:shadow-md transition">
              <SubjectChip subject={s.subject} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-slate-500">
                    論点 {s.topicsStarted}/{s.topics}・正答率 {pct(s.accuracy)}
                  </span>
                </div>
                <ProgressBar value={s.questionsSeen} max={s.questions} color={s.color} className="mt-1.5" />
              </div>
              {s.dueCards > 0 && <span className="chip bg-amber-100 text-amber-800">復習 {s.dueCards}</span>}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-2">直近2週間の学習時間</h2>
        <div className="card">
          <div className="flex items-end gap-1 h-24">
            {minutes.map((m) => {
              const max = Math.max(30, ...minutes.map((x) => x.minutes));
              return (
                <div key={m.day} className="flex-1 flex flex-col items-center justify-end h-full" title={`${m.day}: ${m.minutes}分`}>
                  <div className="w-full rounded-t bg-brand/80" style={{ height: `${Math.max(2, (m.minutes / max) * 100)}%` }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{minutes[0]?.day.slice(5)}</span>
            <span>今日</span>
          </div>
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="font-bold mb-2">最近の結果</h2>
          <div className="space-y-2">
            {recent.map((s) => (
              <Link key={s.id} to={`/session/${s.id}/result`} className="card flex items-center justify-between hover:shadow-md transition">
                <div>
                  <div className="font-medium text-sm">{s.config.title}</div>
                  <div className="text-xs text-slate-500">{formatDate(s.endedAt!)}</div>
                </div>
                <div className="text-sm text-right">
                  {s.result && s.result.maxScore > 0 ? (
                    <span className="font-bold">
                      {s.result.score}/{s.result.maxScore}点
                    </span>
                  ) : s.result ? (
                    <span className="font-bold">{pct(s.result.answered ? s.result.correct / s.result.answered : null)}</span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-slate-400 leading-5">
        教材は AI が作成した学習補助資料です。2027年論文式試験の法令基準日は 2027年4月1日（租税法は 2027年1月1日）です。<Link to="/procedures" className="underline">適用基準・法令</Link>を確認のうえ、必ず原典・基準書で確認してください。
      </p>

      <Modal open={!!picking} onClose={() => setPicking(null)} title={picking?.title ?? ""}>
        <p className="text-slate-600 mb-3">科目を選んでください（すべて＝全科目から復習優先で選択）</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-primary" onClick={() => picking && run(picking)}>
            すべての科目
          </button>
          {SUBJECTS.map((s) => (
            <button key={s.id} className="btn text-white" style={{ backgroundColor: s.color }} onClick={() => picking && run(picking, [s.id])}>
              {s.name}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
