import { formatDuration } from "./ui";

export function Timer({ elapsedSec, limitMinutes }: { elapsedSec: number; limitMinutes: number }) {
  if (limitMinutes > 0) {
    const remaining = limitMinutes * 60 - elapsedSec;
    const warn = remaining <= 300;
    return (
      <div className={`font-mono text-sm tabular-nums ${remaining < 0 ? "text-red-600 font-bold" : warn ? "text-amber-600 font-semibold" : "text-slate-600"}`} aria-live="polite">
        残り {remaining < 0 ? "-" : ""}
        {formatDuration(Math.abs(remaining))}
      </div>
    );
  }
  return <div className="font-mono text-sm tabular-nums text-slate-600">{formatDuration(elapsedSec)}</div>;
}
