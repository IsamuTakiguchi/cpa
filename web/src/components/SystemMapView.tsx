import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Attempt, Subject, TopicProgress } from "@cpa/shared";
import { Mermaid } from "./Mermaid";
import { accuracyOf, latestAttemptByQuestion } from "../lib/stats";

type Level = "none" | "read" | "practice" | "weak" | "done";

const LEVEL_STYLE: Record<Level, { fill: string; stroke: string; label: string }> = {
  none: { fill: "#f8fafc", stroke: "#94a3b8", label: "未着手" },
  read: { fill: "#e0f2fe", stroke: "#0284c7", label: "一読" },
  practice: { fill: "#fef3c7", stroke: "#d97706", label: "演習中" },
  weak: { fill: "#fee2e2", stroke: "#dc2626", label: "要復習（正答率70%未満）" },
  done: { fill: "#dcfce7", stroke: "#16a34a", label: "仕上がり" },
};

/** 論点ごとの学習状況を判定 */
export function topicLevel(topicId: string, progress: TopicProgress[], attempts: Attempt[]): Level {
  const p = progress.find((x) => x.id === topicId);
  const latest = [...latestAttemptByQuestion(attempts).values()].filter((a) => a.topicId === topicId && a.kind !== "card");
  const accs = latest.map(accuracyOf).filter((v): v is number => v !== null);
  const acc = accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : null;
  if (p?.mastery === 3) return "done";
  if (acc !== null && acc < 0.7) return "weak";
  if (latest.length > 0 || p?.mastery === 2) return "practice";
  if (p?.noteReadAt || p?.mastery === 1) return "read";
  return "none";
}

/** 科目の体系マップ。進捗で色分けし、ノードをクリックすると論点へ */
export function SystemMapView({ subject, progress, attempts }: { subject: Subject; progress: TopicProgress[]; attempts: Attempt[] }) {
  const navigate = useNavigate();
  const levels = useMemo(() => {
    const m = new Map<string, Level>();
    for (const [node, topicId] of Object.entries(subject.systemMap.nodeTopics)) m.set(node, topicLevel(topicId, progress, attempts));
    return m;
  }, [subject, progress, attempts]);

  const code = useMemo(() => {
    const defs = (Object.keys(LEVEL_STYLE) as Level[]).map((l) => `  classDef lv_${l} fill:${LEVEL_STYLE[l].fill},stroke:${LEVEL_STYLE[l].stroke},stroke-width:2px,cursor:pointer;`);
    const assigns = [...levels.entries()].map(([node, lv]) => `  class ${node} lv_${lv};`);
    return `${subject.systemMap.mermaid.trimEnd()}\n${defs.join("\n")}\n${assigns.join("\n")}\n`;
  }, [subject, levels]);

  const onRendered = useCallback(
    (svg: SVGSVGElement) => {
      for (const [node, topicId] of Object.entries(subject.systemMap.nodeTopics)) {
        // mermaid は id を "<描画id>-flowchart-<node>-<n>" の形にする
        const els = svg.querySelectorAll<SVGGElement>(`g.node[id*="flowchart-${node}-"]`);
        els.forEach((el) => {
          el.style.cursor = "pointer";
          el.onclick = () => navigate(`/topics/${topicId}`);
          el.setAttribute("role", "link");
        });
      }
    },
    [subject, navigate],
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="font-bold">体系マップ</h2>
        <span className="text-xs text-slate-500">ノードをタップすると論点へ</span>
      </div>
      <Mermaid code={code} onRendered={onRendered} title={`${subject.name} 体系マップ`} fitWidth={false} />
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
        {(Object.keys(LEVEL_STYLE) as Level[]).map((l) => (
          <span key={l} className="inline-flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded border-2" style={{ backgroundColor: LEVEL_STYLE[l].fill, borderColor: LEVEL_STYLE[l].stroke }} />
            {LEVEL_STYLE[l].label}
          </span>
        ))}
      </div>
    </div>
  );
}
