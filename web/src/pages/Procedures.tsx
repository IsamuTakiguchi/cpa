import { useState } from "react";
import { APPLICABLE_STANDARDS, EXAM_AUDIENCE, EXAM_CHANGES_2027, EXAM_INFO_LAST_VERIFIED, EXAM_INFO_SOURCES, EXAM_TIMETABLE, EXEMPTION_GUIDE } from "@cpa/shared";
import { Alert, PageTitle } from "../components/ui";
import { saveSettings } from "../db/local";
import { useSettings } from "../hooks/useData";
import { allChecklist, allEvents, buildIcs, daysFrom, formatJpDate, googleCalendarUrl } from "../lib/examSchedule";
import { syncEngine } from "../sync/syncEngine";

type Tab = "schedule" | "checklist" | "exemption" | "standards";

export function ProceduresPage() {
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>("schedule");
  const checks = settings.procedureChecks ?? {};
  const now = new Date();
  const events = allEvents();
  const checklist = allChecklist();

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
      <PageTitle title="手続き・スケジュール" subtitle={`2027年（令和9年）論文式試験。公式情報の最終確認日: ${EXAM_INFO_LAST_VERIFIED}`} />
      <div className="card border-l-4 border-brand">
        <div className="font-bold">{EXAM_AUDIENCE.title} の方向けの案内</div>
        <div className="text-sm mt-1">{EXAM_AUDIENCE.subjects}</div>
        <div className="text-sm text-slate-600">{EXAM_AUDIENCE.exempt}</div>
        <ul className="list-disc pl-5 mt-2 text-sm text-slate-700 space-y-1 leading-6">
          {EXAM_AUDIENCE.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </div>

      <div className="flex border-b border-slate-200 no-print overflow-x-auto">
        {(["schedule", "checklist", "exemption", "standards"] as Tab[]).map((t) => (
          <button key={t} className={`px-4 py-2 text-sm -mb-px border-b-2 whitespace-nowrap ${tab === t ? "border-brand text-brand font-semibold" : "border-transparent text-slate-500"}`} onClick={() => setTab(t)}>
            {{ schedule: "日程", checklist: `チェックリスト (${done}/${checklist.length})`, exemption: "免除申請・当日", standards: "適用基準・法令" }[t]}
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
          <Alert kind="info">「予定・未確定」の日付は令和8年試験の運用からの見込みです。2027年1月に公表される第Ⅱ回受験案内で確定し、この画面も更新されます。</Alert>
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
          <Alert kind="info">チェックを付けると、ホームのリマインドから消えます。期限のある項目は期限の30日前からホームに表示されます。免除通知書を既にお持ちなら、最初の3項目のうち「取り寄せ」「郵送」は不要です（チェックして消してください）。</Alert>
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

      {tab === "exemption" && (
        <div className="space-y-4">
          <div className="card">
            <div className="font-bold mb-2">免除申請（免除通知書をまだ持っていない場合）</div>
            <p className="text-sm text-slate-700 leading-6">
              <span className="font-semibold">対象:</span> {EXEMPTION_GUIDE.who}
            </p>
            <p className="text-sm text-slate-700 leading-6 mt-1">
              <span className="font-semibold">免除内容:</span> {EXEMPTION_GUIDE.exempt}
            </p>
            <div className="mt-3 text-sm font-semibold">提出書類</div>
            <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1 leading-6">
              {EXEMPTION_GUIDE.documents.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ol>
            <div className="mt-3 text-sm font-semibold">送付先</div>
            <p className="text-sm text-slate-700 leading-6">{EXEMPTION_GUIDE.sendTo}</p>
            <p className="text-sm text-slate-700 leading-6">{EXEMPTION_GUIDE.how}</p>
            <ul className="list-disc pl-5 mt-3 text-sm text-slate-600 space-y-1 leading-6">
              {EXEMPTION_GUIDE.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
            <a className="text-xs text-brand underline" href={EXEMPTION_GUIDE.url} target="_blank" rel="noreferrer">
              免除申請の手続について（申請書様式）
            </a>
          </div>
          <div className="card">
            <div className="font-bold mb-1">論文式試験の時間割</div>
            <p className="text-xs text-slate-500 mb-2">令和8年試験の時間割に基づく見込み。令和9年分は第Ⅱ回受験案内で確定。受験するのは 1日目・2日目のみ。</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-1 pr-2">日</th>
                    <th className="pr-2">科目</th>
                    <th className="pr-2">着席</th>
                    <th className="pr-2">試験時間</th>
                    <th>備考</th>
                  </tr>
                </thead>
                <tbody>
                  {EXAM_TIMETABLE.map((r, i) => (
                    <tr key={i} className={`border-b border-slate-100 ${r.attend ? "" : "text-slate-400"}`}>
                      <td className="py-1.5 pr-2 whitespace-nowrap">
                        {r.day}
                        <br />
                        <span className="text-xs">{formatJpDate(r.date)}</span>
                      </td>
                      <td className={`pr-2 ${r.attend ? "font-semibold" : "line-through"}`}>{r.subject}</td>
                      <td className="pr-2 whitespace-nowrap">{r.seated}</td>
                      <td className="pr-2 whitespace-nowrap">{r.time}</td>
                      <td className="text-xs">{r.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <div className="font-bold mb-1">当日の持ち物・注意</div>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 leading-6">
              <li>受験票と写真票（出願サイトから A4 に印刷。両面印刷不可）。写真票は試験官が回収する。</li>
              <li>本人確認書類: 顔写真付き・有効期限内・生年月日記載のもの（運転免許証、マイナンバーカード、パスポート等の8種類）。</li>
              <li>会計学（午後）・監査論・租税法では法令基準等が配付される。私物の法令集・基準集は持ち込めない前提で、配付一覧（4月頃確定）を確認。</li>
              <li>耳栓は使用禁止。筆記用具・電卓は受験案内の規定に従う。</li>
              <li>試験場は試験日の約1か月前に公表。同一試験地に複数会場がある場合は特に注意。</li>
            </ul>
          </div>
        </div>
      )}

      {tab === "standards" && (
        <div className="space-y-4">
          <div className="card">
            <div className="font-bold mb-2">法令基準日（2027年 論文式試験）</div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-500">会計学・監査論</td>
                  <td>{formatJpDate(APPLICABLE_STANDARDS.ronbunBasisDate)} 現在 施行（適用）の法令等</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 text-slate-500">租税法</td>
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
