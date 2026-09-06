import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useSync } from "../hooks/useSync";

const NAV = [
  { to: "/", label: "ホーム", icon: "🏠" },
  { to: "/subjects", label: "科目", icon: "📚" },
  { to: "/session/new", label: "出題", icon: "✍️" },
  { to: "/review", label: "復習", icon: "🔁" },
  { to: "/summaries", label: "まとめ", icon: "📝" },
  { to: "/history", label: "履歴", icon: "📈" },
  { to: "/procedures", label: "手続き", icon: "📅" },
  { to: "/settings", label: "設定", icon: "⚙️" },
];

const MOBILE_NAV = NAV.filter((n) => ["/", "/subjects", "/session/new", "/review", "/settings"].includes(n.to));

export function Layout() {
  const { user } = useAuth();
  const sync = useSync();
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex md:flex-col w-56 shrink-0 bg-brand text-white no-print">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-lg font-bold leading-tight">CPA 論文式</div>
          <div className="text-xs text-white/70">2027年 会計学・監査論・租税法</div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `flex items-center gap-3 px-5 py-2.5 text-sm ${isActive ? "bg-white/15 font-semibold" : "hover:bg-white/10 text-white/90"}`}>
              <span aria-hidden>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-3 text-xs text-white/70 border-t border-white/10">
          {user ? (
            <>
              <div className="truncate">{user.email}</div>
              <SyncBadge />
            </>
          ) : (
            <NavLink to="/auth" className="underline">
              ログイン / 登録
            </NavLink>
          )}
          {!user && <div className="mt-1">ゲストモード（この端末に保存）</div>}
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-30 bg-brand text-white px-4 py-3 flex items-center justify-between no-print">
          <div className="font-bold">CPA 論文式</div>
          <div className="text-xs text-white/80 flex items-center gap-2">
            {user ? <SyncBadge /> : <NavLink to="/auth">ゲスト</NavLink>}
          </div>
        </header>
        <main className="flex-1 px-4 py-4 md:px-8 md:py-6 max-w-5xl w-full mx-auto pb-24 md:pb-8 print-area">
          <Outlet />
        </main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 flex justify-around no-print" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {MOBILE_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 px-2 text-[11px] min-w-[56px] ${isActive ? "text-brand font-semibold" : "text-slate-500"}`}>
              <span className="text-lg leading-none" aria-hidden>
                {n.icon}
              </span>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {sync.status === "offline" && user && <div className="fixed top-12 md:top-2 right-2 z-40 rounded bg-slate-800 text-white text-xs px-2 py-1 no-print">オフライン（端末に保存中）</div>}
    </div>
  );
}

function SyncBadge() {
  const s = useSync();
  const label = s.status === "syncing" ? "同期中…" : s.status === "offline" ? "オフライン" : s.status === "error" ? "同期エラー" : s.pending > 0 ? `未送信 ${s.pending}` : "同期済み";
  const color = s.status === "error" ? "bg-red-400" : s.status === "offline" ? "bg-slate-400" : s.status === "syncing" ? "bg-amber-300" : "bg-emerald-400";
  return (
    <span className="inline-flex items-center gap-1" title={s.error ?? ""}>
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
