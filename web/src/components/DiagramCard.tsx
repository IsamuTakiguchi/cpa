import type { Diagram } from "@cpa/shared";
import { Mermaid } from "./Mermaid";

const KIND_LABEL: Record<Diagram["kind"], string> = { flow: "処理の流れ", decision: "判断フロー", tree: "分類", relation: "関係図", timeline: "時系列", mindmap: "全体像" };

export function DiagramCard({ diagram }: { diagram: Diagram }) {
  return (
    <div className="card break-inside-avoid">
      <div className="flex items-center gap-2 mb-2">
        <span className="chip bg-indigo-100 text-indigo-800">{KIND_LABEL[diagram.kind]}</span>
        <h3 className="font-bold">{diagram.title}</h3>
      </div>
      <Mermaid code={diagram.mermaid} title={diagram.title} />
      <p className="text-sm text-slate-600 mt-2 leading-6">{diagram.caption}</p>
      {diagram.keyPoints.length > 0 && (
        <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <div className="text-xs font-semibold text-amber-900 mb-1">この図で押さえること</div>
          <ul className="list-disc pl-5 text-sm space-y-0.5">
            {diagram.keyPoints.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
