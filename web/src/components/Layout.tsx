import { NavLink, Outlet, useLocation } from "react-router-dom";
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
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen md:flex">
      <div className="glass-bg no-print" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 sticky top-0 h-screen glass border-y-0 border-l-0 rounded-none no-print">
        <div className="px-5 py-5 border-b border-slate-900/10">
          <div className="text-lg font-bold leading-tight text-gradient">CPA 論文式</div>
          <div className="text-xs text-slate-500">2027年 会計学・監査論・租税法</div>
        </div>
        <nav className="flex-1 py-3 px-3 space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-brand-light to-brand text-white font-semibold shadow-[0_6px_20px_-6px_rgba(30,58,95,.6)]"
                    : "text-slate-700 hover:bg-white/60 hover:translate-x-0.5"
                }`
              }
            >
              <span aria-hidden>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-3 text-xs text-slate-500 border-t border-slate-900/10">
          {user ? (
            <>
              <div className="truncate">{user.email}</div>
              <SyncBadge />
            </>
          ) : (
            <NavLink to="/auth" className="underline text-brand">
              ログイン / 登録
            </NavLink>
          )}
          {!user && <div className="mt-1">ゲストモード（この端末に保存）</div>}
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-30 glass rounded-none border-x-0 border-t-0 px-4 py-3 flex items-center justify-between no-print">
          <div className="font-bold text-gradient">CPA 論文式</div>
          <div className="text-xs text-slate-600 flex items-center gap-2">
            {user ? (
              <SyncBadge />
            ) : (
              <NavLink to="/auth" className="chip bg-white/70 text-slate-700">
                ゲスト
              </NavLink>
            )}
          </div>
        </header>
        <main className="flex-1 px-4 py-4 md:px-8 md:py-6 max-w-5xl w-full mx-auto pb-28 md:pb-8 print-area">
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
        <nav className="md:hidden fixed bottom-3 inset-x-3 z-30 glass rounded-2xl flex justify-around no-print" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
          {MOBILE_NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 py-2 px-2 text-[11px] min-w-[56px] transition-all duration-200 ${
                  isActive ? "text-brand font-semibold -translate-y-0.5" : "text-slate-500"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="text-lg leading-none" aria-hidden>
                    {n.icon}
                  </span>
                  {n.label}
                  <span className={`absolute -bottom-0.5 h-1 w-1 rounded-full bg-brand transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0"}`} aria-hidden />
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      {sync.status === "offline" && user && <div className="fixed top-14 md:top-3 right-3 z-40 glass-dark rounded-xl text-white text-xs px-3 py-1.5 no-print animate-fade-in">オフライン（端末に保存中）</div>}
    </div>
  );
}

function SyncBadge() {
  const s = useSync();
  const label = s.status === "syncing" ? "同期中…" : s.status === "offline" ? "オフライン" : s.status === "error" ? "同期エラー" : s.pending > 0 ? `未送信 ${s.pending}` : "同期済み";
  const color = s.status === "error" ? "bg-red-400" : s.status === "offline" ? "bg-slate-400" : s.status === "syncing" ? "bg-amber-400 animate-pulse" : "bg-emerald-400";
  return (
    <span className="inline-flex items-center gap-1" title={s.error ?? ""}>
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
