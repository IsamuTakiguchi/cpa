import type { ReactNode } from "react";
import { usePaywall, usePro } from "../../billing/ProProvider";

/** 「PRO」の小さな印（プロ版でない人にだけ出す） */
export function ProBadge({ className = "" }: { className?: string }) {
  const { unlocked } = usePro();
  if (unlocked) return null;
  return <span className={`chip bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0 align-middle ${className}`}>PRO</span>;
}

/** プロ版でなければ中身の代わりに案内を出す */
export function ProGate({ feature, title, description, children }: { feature: string; title: string; description: string; children: ReactNode }) {
  const { unlocked } = usePro();
  const openPaywall = usePaywall();
  if (unlocked) return <>{children}</>;
  return (
    <div className="card text-center py-8 space-y-3">
      <div className="text-3xl" aria-hidden>
        🔒
      </div>
      <div className="font-bold">{title}</div>
      <p className="text-sm text-slate-600 leading-6">{description}</p>
      <button className="btn-primary" onClick={() => openPaywall(feature)}>
        プロ版について見る
      </button>
    </div>
  );
}
