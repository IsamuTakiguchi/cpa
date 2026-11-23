/**
 * プロ版の状態をアプリ全体に配る（全アプリ共通の部品）。
 * - ネイティブ: RevenueCat で「pro」エンタイトルメントを確認
 * - Web 版: 課金なし。すべての機能を従来どおり使える（unlocked = true）
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { billingConfigured, cachedIsPro, getProInfo, initBilling, onProInfoChange, type ProInfo } from "../native/billing";
import { billingEnabled } from "../native/platform";

export interface ProState {
  /** このビルドで課金機能を使うか（ネイティブのみ true） */
  enabled: boolean;
  /** RevenueCat の公開キーが設定済みか */
  configured: boolean;
  /** プロ版を購入済み */
  isPro: boolean;
  /** プロ版の機能を使ってよいか（課金なしの Web 版は常に true） */
  unlocked: boolean;
  /** 最初の確認中 */
  loading: boolean;
  info: ProInfo | null;
  refresh: () => Promise<ProInfo | null>;
  setInfo: (info: ProInfo) => void;
}

const Ctx = createContext<ProState | null>(null);

export function ProProvider({ children }: { children: ReactNode }) {
  const enabled = billingEnabled();
  const [info, setInfoState] = useState<ProInfo | null>(null);
  const [isPro, setIsPro] = useState<boolean>(() => (enabled ? cachedIsPro() : false));
  const [loading, setLoading] = useState(enabled);

  const setInfo = useCallback((i: ProInfo) => {
    setInfoState(i);
    setIsPro(i.isPro);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return null;
    try {
      const i = await getProInfo();
      if (i) setInfo(i);
      return i;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, setInfo]);

  useEffect(() => {
    if (!enabled) return;
    let off: (() => void) | null = null;
    let disposed = false;
    void initBilling().then(async (ok) => {
      if (!ok) {
        setLoading(false);
        return;
      }
      await refresh();
      const unsub = await onProInfoChange(setInfo);
      if (disposed) unsub();
      else off = unsub;
    });
    return () => {
      disposed = true;
      off?.();
    };
  }, [enabled, refresh, setInfo]);

  const value = useMemo<ProState>(
    () => ({ enabled, configured: billingConfigured(), isPro, unlocked: !enabled || isPro, loading, info, refresh, setInfo }),
    [enabled, isPro, loading, info, refresh, setInfo],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePro(): ProState {
  const v = useContext(Ctx);
  if (!v) throw new Error("ProProvider がありません");
  return v;
}

/** 課金画面を開く。from は「どの機能から来たか」（画面上の説明に使う） */
export function usePaywall() {
  const navigate = useNavigate();
  return useCallback((from?: string) => navigate(from ? `/pro?from=${encodeURIComponent(from)}` : "/pro"), [navigate]);
}
