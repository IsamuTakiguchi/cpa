import type { GradingPoint } from "@cpa/shared";

export function GradingChecklist({ points, checked, onChange, disabled = false }: { points: GradingPoint[]; checked: number[]; onChange: (next: number[]) => void; disabled?: boolean }) {
  const total = points.reduce((s, p) => s + p.score, 0);
  const score = checked.reduce((s, i) => s + (points[i]?.score ?? 0), 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-slate-700">採点ポイント（書けていれば✓）</div>
        <div className="text-sm font-bold text-brand">
          {score} / {total} 点
        </div>
      </div>
      <ul className="space-y-1.5">
        {points.map((p, i) => {
          const on = checked.includes(i);
          return (
            <li key={i}>
              <label className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer ${on ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200"} ${disabled ? "opacity-70 cursor-default" : ""}`}>
                <input type="checkbox" className="mt-1" checked={on} disabled={disabled} onChange={() => onChange(on ? checked.filter((x) => x !== i) : [...checked, i].sort())} />
                <span className="flex-1 text-sm">{p.text}</span>
                <span className="text-xs text-slate-500 shrink-0">{p.score}点</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
