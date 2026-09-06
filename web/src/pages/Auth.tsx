import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, PageTitle } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

export function AuthPage() {
  const { user, login, signup, logout, serverUnavailable, googleEnabled } = useAuth();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const e = params.get("error");
    if (e) setError(e);
  }, [params]);

  const startGoogle = () => {
    try {
      localStorage.setItem("cpa.oauthPending", "1");
    } catch {
      /* ignore */
    }
    window.location.href = "/api/auth/google";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password, code);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className="max-w-md mx-auto">
        <PageTitle title="アカウント" />
        <div className="card space-y-3">
          {params.get("login") === "google" && <Alert kind="success">Google アカウントでログインしました。</Alert>}
          <div>
            ログイン中: <span className="font-medium">{user.email}</span>
          </div>
          <p className="text-sm text-slate-600">この端末の学習データはサーバーと同期されます。別の端末で同じアカウントにログインすると同じデータが使えます。</p>
          <button className="btn-secondary" onClick={() => logout()}>
            ログアウト（端末内のデータは残ります）
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <PageTitle title={mode === "login" ? "ログイン" : "新規登録"} subtitle="PC とスマホで学習データを同期するにはログインが必要です" />
      {serverUnavailable && <Alert kind="warn">サーバーに接続できません。ゲストモード（端末内保存）で利用できます。</Alert>}
      {googleEnabled && (
        <div className="card mt-3 space-y-2">
          <button type="button" className="btn-secondary w-full py-3 text-base" onClick={startGoogle}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.7 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>
            Google アカウントでログイン
          </button>
          <p className="text-xs text-slate-500 text-center">Gmail のアカウントでそのままログインできます（パスワード不要）</p>
        </div>
      )}
      {googleEnabled && <div className="text-center text-xs text-slate-400 mt-3">または、メールアドレスとパスワードで</div>}
      <form className="card space-y-3 mt-3" onSubmit={submit}>
        <div>
          <label className="label">メールアドレス</label>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">パスワード（10文字以上）</label>
          <input className="input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {mode === "signup" && (
          <div>
            <label className="label">招待コード（サーバーの SIGNUP_CODE）</label>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
        )}
        {error && <Alert kind="error">{error}</Alert>}
        <button className="btn-primary w-full" type="submit" disabled={busy}>
          {busy ? "処理中…" : mode === "login" ? "ログイン" : "登録してログイン"}
        </button>
        <button type="button" className="btn-ghost w-full text-sm" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "はじめての方: 新規登録へ" : "アカウントをお持ちの方: ログインへ"}
        </button>
        <p className="text-xs text-slate-500 leading-5">ログイン時、この端末に保存されているゲストデータはアカウントに取り込まれます。</p>
      </form>
    </div>
  );
}
