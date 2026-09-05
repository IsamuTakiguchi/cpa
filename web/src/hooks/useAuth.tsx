import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, type MeResponse } from "../api/client";
import { syncEngine } from "../sync/syncEngine";

interface AuthState {
  /** null = 未ログイン / undefined = 確認中 */
  user: MeResponse["user"] | undefined;
  aiEnabled: boolean;
  aiModel: string;
  /** サーバーに到達できない（ローカル開発で API 無し等） */
  serverUnavailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse["user"] | undefined>(undefined);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModel, setAiModel] = useState("");
  const [serverUnavailable, setServerUnavailable] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me.user);
      setAiEnabled(me.aiEnabled);
      setAiModel(me.aiModel);
      setServerUnavailable(false);
    } catch (e) {
      setUser(null);
      if (!(e instanceof ApiError)) setServerUnavailable(true);
    }
  }, []);

  useEffect(() => {
    void syncEngine.init().then(refresh);
  }, [refresh]);

  useEffect(() => {
    if (user) syncEngine.enable();
    else if (user === null) syncEngine.disable();
  }, [user]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      await syncEngine.enqueueAll();
      setUser(res.user);
      await refresh();
    },
    [refresh],
  );
  const signup = useCallback(
    async (email: string, password: string, code: string) => {
      const res = await api.signup(email, password, code);
      await syncEngine.enqueueAll();
      setUser(res.user);
      await refresh();
    },
    [refresh],
  );
  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    await syncEngine.resetCursor();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(() => ({ user, aiEnabled, aiModel, serverUnavailable, login, signup, logout, refresh }), [user, aiEnabled, aiModel, serverUnavailable, login, signup, logout, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("AuthProvider がありません");
  return v;
}
