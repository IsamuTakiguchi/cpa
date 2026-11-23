import { useState } from "react";
import { Link } from "react-router-dom";
import { usePro } from "../../billing/ProProvider";
import { restore } from "../../native/billing";
import { haptic } from "../../native/haptics";
import { Alert } from "../ui";

/** 設定画面の「プロ版」欄（全アプリ共通）。購入状況の表示と「購入を復元」 */
export function ProSettings() {
  const pro = usePro();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error" | "warn"; text: string } | null>(null);
  if (!pro.enabled) return null;

  const doRestore = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const info = await restore();
      pro.setInfo(info);
      if (info.isPro) {
        haptic.success();
        setMsg({ kind: "success", text: "購入を復元しました。" });
      } else setMsg({ kind: "warn", text: "この Apple ID で復元できる購入は見つかりませんでした。" });
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-3">
      <h2 className="font-bold">プロ版</h2>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="text-sm">
        {pro.loading ? (
          "確認中…"
        ) : pro.isPro ? (
          <>
            <span className="chip bg-emerald-100 text-emerald-800 mr-2">利用中</span>
            購入元: {pro.info?.store ?? "—"}
          </>
        ) : (
          <span className="text-slate-600">未購入（無料版）</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/pro" className="btn-primary text-sm">
          {pro.isPro ? "購入状況を見る" : "プロ版について見る"}
        </Link>
        <button className="btn-secondary text-sm" disabled={busy || !pro.configured} onClick={doRestore}>
          {busy ? "確認中…" : "購入を復元"}
        </button>
      </div>
      <p className="text-xs text-slate-500">機種変更や再インストールをした場合は「購入を復元」を押してください（同じ Apple ID が必要です）。</p>
    </section>
  );
}
