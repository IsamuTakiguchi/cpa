import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getSubject, KIND_LABELS, type QuestionKind, type SubjectId } from "@cpa/shared";

export function SubjectChip({ subject, small = false }: { subject: SubjectId | string; small?: boolean }) {
  const s = getSubject(subject);
  if (!s) return null;
  return (
    <span className={`chip text-white ${small ? "text-[10px] px-2" : ""}`} style={{ backgroundColor: `${s.color}e6`, boxShadow: `0 4px 12px -4px ${s.color}99, inset 0 1px 0 rgba(255,255,255,.35)` }}>
      {s.shortName}
    </span>
  );
}

export function KindChip({ kind }: { kind: QuestionKind | string }) {
  const colors: Record<string, string> = {
    card: "bg-sky-100/80 text-sky-800",
    tf: "bg-emerald-100/80 text-emerald-800",
    short: "bg-teal-100/80 text-teal-800",
    mini: "bg-amber-100/80 text-amber-800",
    calc: "bg-violet-100/80 text-violet-800",
    essay: "bg-rose-100/80 text-rose-800",
  };
  return <span className={`chip ${colors[kind] ?? "bg-slate-100/80 text-slate-700"}`}>{KIND_LABELS[kind as QuestionKind] ?? kind}</span>;
}

export function ProgressBar({ value, max, color = "var(--color-brand)", className = "" }: { value: number; max: number; color?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-2 w-full rounded-full bg-slate-900/8 overflow-hidden shadow-[inset_0_1px_2px_rgba(30,58,95,.08)] ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full relative overflow-hidden transition-[width] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ width: `${pct}%`, backgroundColor: color }}>
        <span className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent" aria-hidden />
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card text-center py-10 text-slate-500">
      <p className="font-medium text-slate-700">{title}</p>
      {children && <div className="mt-2 text-sm">{children}</div>}
    </div>
  );
}

export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  // backdrop-filter を持つ祖先（ガラスのカード）は fixed の基準になるため、body 直下に描画する
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/30 backdrop-blur-sm p-0 sm:p-4 no-print animate-fade-in" onClick={onClose}>
      <div className="w-full sm:max-w-lg md:max-w-4xl glass-strong rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col animate-sheet-up sm:animate-pop" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sm:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-slate-900/15" aria-hidden />
        <div className="px-5 pt-3 sm:pt-4 pb-2 font-bold text-lg border-b border-slate-900/10">{title}</div>
        <div className="px-5 py-4 overflow-y-auto text-sm">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-900/10 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Alert({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const cls = {
    info: "bg-sky-50/70 text-sky-900 border-sky-200/80",
    warn: "bg-amber-50/70 text-amber-900 border-amber-200/80",
    error: "bg-red-50/70 text-red-900 border-red-200/80",
    success: "bg-emerald-50/70 text-emerald-900 border-emerald-200/80",
  }[kind];
  return <div className={`rounded-xl border backdrop-blur-sm px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`;
}
