import { useMemo, useState } from "react";
import { APPLICABLE_STANDARDS, EXAM_CHANGES_2027, EXAM_INFO_LAST_VERIFIED, EXAM_INFO_SOURCES, EXAM_TRACK_LABELS, type ExamTrack } from "@cpa/shared";
import { Alert, PageTitle } from "../components/ui";
import { saveSettings } from "../db/local";
import { useSettings } from "../hooks/useData";
import { buildIcs, checklistForTrack, daysFrom, eventsForTrack, formatJpDate, googleCalendarUrl } from "../lib/examSchedule";
import { syncEngine } from "../sync/syncEngine";

type Tab = "schedule" | "checklist" | "standards";

export function ProceduresPage() {
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>("schedule");
  const track = (settings.examTrack ?? "") as ExamTrack | "";
  const checks = settings.procedureChecks ?? {};
  const now = new Date();
  const events = useMemo(() => eventsForTrack(track), [track]);
  const checklist = useMemo(() => checklistForTrack(track), [track]);

  const setTrack = async (t: ExamTrack | "") => {
    await saveSettings({ examTrack: t });
    syncEngine.schedule();
  };
  const toggle = async (id: string) => {
    const next = { ...checks };
    if (next[id]) delete next[id];
    else next[id] = new Date().toISOString();
    await saveSettings({ procedureChecks: next });
    syncEngine.schedule();
  };
  const downloadIcs = () => {
    const blob = new Blob([buildIcs(events)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cpa-exam-2027.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const done = checklist.filter((c) => checks[c.id]).length;

  return (
    <div className="space-y-4 max-w-3xl">
      <PageTitle title="手続き・スケジュール" subtitle={`2027年（令和9年）試験。公式情報の最終確認日: ${EXAM_INFO_LAST_VERIFIED}`} />
      <div className="card">
        <label className="label">受験区分（自分に関係する期限だけを表示）</label>
        <select className="input" value={track} onChange={(e) => setTrack(e.target.value as ExamTrack | "")}>
          <option value="">未設定（すべての期限を表示）</option>
          {(Object.keys(EXAM_TRACK_LABELS) as ExamTrack[]).map((t) => (
            <option key={t} value={t}>
              {EXAM_TRACK_LABELS[t]}
            </option>
          ))}
        </select>
        {track === "" && <p className="text-xs text-slate-500 mt-1">短答式に合格済み（または全部免除）の方は「論文式のみ受験」を選ぶと、第Ⅱ回短答式の出願期間（2027年2月）に論文式の出願をする必要がある旨が表示されます。</p>}
      </div>

      <div className="flex border-b border-slate-200 no-print">
        {(["schedule", "checklist", "standards"] as Tab[]).map((t) => (
          <button key={t} className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === t ? "border-brand text-brand font-semibold" : "border-transparent text-slate-500"}`} onClick={() => setTab(t)}>
            {{ schedule: "日程", checklist: `チェックリスト (${done}/${checklist.length})`, standards: "適用基準・法令" }[t]}
          </button>
        ))}
      </div>

      {tab === "schedule" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary text-sm" onClick={downloadIcs}>
              すべてカレンダーに追加（.ics）
            </button>
            <span className="text-xs text-slate-500 self-center">iPhone/Android のカレンダーや Google カレンダーに取り込めます。期限と試験日には1週間前・前日の通知が付きます。</span>
          </div>
          {events.map((e) => {
            const days = daysFrom(e.endDate ?? e.date, now);
            const past = days < 0;
            const urgent = !past && days <= 14 && (e.kind === "deadline" || e.kind === "exam");
            return (
              <div key={e.id} className={`card ${past ? "opacity-60" : ""} ${urgent ? "border-red-300 bg-red-50/40" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">
                      {formatJpDate(e.date)}
                      {e.endDate && ` 〜 ${formatJpDate(e.endDate)}`}
                      {e.time && `　${e.time}`}
                      {e.tentative && <span className="chip bg-amber-100 text-amber-800 ml-2">予定・未確定</span>}
                    </div>
                    <div className="font-semibold mt-0.5">
                      <span className={`chip mr-2 ${e.kind === "deadline" ? "bg-red-100 text-red-800" : e.kind === "exam" ? "bg-brand text-white" : e.kind === "announcement" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                        {{ deadline: "期限", exam: "試験", announcement: "発表", info: "情報" }[e.kind]}
                      </span>
                      {e.title}
                    </div>
                    <p className="text-sm text-slate-600 mt-1 leading-6">{e.description}</p>
                    {e.url && (
                      <a className="text-xs text-brand underline" href={e.url} target="_blank" rel="noreferrer">
                        公式ページを開く
                      </a>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-lg font-bold ${urgent ? "text-red-700" : past ? "text-slate-400" : "text-slate-800"}`}>{past ? "終了" : days === 0 ? "今日" : `あと${days}日`}</div>
                    <a className="text-xs text-brand underline no-print" href={googleCalendarUrl(e)} target="_blank" rel="noreferrer">
                      Google カレンダー
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "checklist" && (
        <div className="space-y-2">
          <Alert kind="info">チェックを付けると、ホームのリマインドから消えます。期限のある項目は期限の30日前からホームに表示されます。</Alert>
          {checklist.map((c) => {
            const checked = !!checks[c.id];
            const days = c.due ? daysFrom(c.due, now) : null;
            const urgent = !checked && days !== null && days <= 14;
            return (
              <label key={c.id} className={`card flex items-start gap-3 cursor-pointer ${checked ? "opacity-60" : ""} ${urgent ? "border-red-300" : ""}`}>
                <input type="checkbox" className="mt-1.5" checked={checked} onChange={() => toggle(c.id)} />
                <div className="min-w-0 flex-1">
                  <div className={`font-medium ${checked ? "line-through" : ""}`}>{c.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {c.due && (
                      <span className={urgent ? "text-red-700 font-semibold" : ""}>
                        期限 {formatJpDate(c.due)}
                        {days !== null && !checked && (days < 0 ? "（期限超過）" : days === 0 ? "（今日）" : `（あと${days}日）`)}
                      </span>
                    )}
                    {checked && `　完了 ${new Date(checks[c.id]!).toLocaleDateString("ja-JP")}`}
                  </div>
                  <p className="text-sm text-slate-600 mt-1 leading-6">{c.detail}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {tab === "standards" && (
        <div className="space-y-4">
          <div className="card">
            <div className="font-bold mb-2">法令基準日（2027年試験）</div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-500">第Ⅰ回短答式</td>
                  <td>{formatJpDate(APPLICABLE_STANDARDS.tanto1BasisDate)} 現在 施行（適用）の法令等</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-500">第Ⅱ回短答式・論文式</td>
                  <td>{formatJpDate(APPLICABLE_STANDARDS.ronbunBasisDate)} 現在 施行（適用）の法令等</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 text-slate-500">租税法（論文式）</td>
                  <td className="font-semibold">{formatJpDate(APPLICABLE_STANDARDS.taxBasisDate)} 現在 施行の法令（令和9年度税制改正は含まれない）</td>
                </tr>
              </tbody>
            </table>
            <ul className="list-disc pl-5 mt-3 text-sm text-slate-700 space-y-1">
              {APPLICABLE_STANDARDS.general.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
          {APPLICABLE_STANDARDS.subjects.map((s) => (
            <div key={s.subject} className="card">
              <div className="font-bold mb-1">
                {s.subject} <span className="text-xs font-normal text-slate-500">基準日 {formatJpDate(s.basisDate)}</span>
              </div>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 leading-6">
                {s.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
          <div className="card">
            <div className="font-bold mb-1">2027年試験の制度変更</div>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 leading-6">
              {EXAM_CHANGES_2027.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="font-bold mb-1">出典（公認会計士・監査審査会ほか）</div>
            <ul className="text-sm space-y-1">
              {EXAM_INFO_SOURCES.map((s) => (
                <li key={s.url}>
                  <a className="text-brand underline" href={s.url} target="_blank" rel="noreferrer">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 mt-2">最終確認日: {EXAM_INFO_LAST_VERIFIED}。毎月自動で公式サイトを確認し、変更があればこの画面と教材を更新します。</p>
          </div>
        </div>
      )}
    </div>
  );
}
