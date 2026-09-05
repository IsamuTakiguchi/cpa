import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, PageTitle } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

export function AuthPage() {
  const { user, login, signup, logout, serverUnavailable } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

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
