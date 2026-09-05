import { Link } from "react-router-dom";
import { EmptyState, formatDate, PageTitle } from "../components/ui";
import { useSummaries } from "../hooks/useData";
import { deleteSummary } from "../lib/repo";
import { SUBJECTS } from "@cpa/shared";

export function SummariesPage() {
  const summaries = useSummaries().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return (
    <div>
      <PageTitle
        title="まとめノート"
        subtitle="試験前の見直し用に、要点・カード・弱点を1枚にまとめる"
        right={
          <Link to="/summaries/new" className="btn-primary">
            ＋ 作成
          </Link>
        }
      />
      {summaries.length === 0 ? (
        <EmptyState title="まだまとめノートがありません">
          「作成」から範囲と素材を選ぶと、印刷・PDF 保存できるまとめが生成されます。
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {summaries.map((s) => (
            <div key={s.id} className="card flex items-center gap-3">
              <Link to={`/summaries/${s.id}`} className="flex-1 min-w-0">
                <div className="font-semibold truncate">{s.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {s.scope.subjects.length ? s.scope.subjects.map((id) => SUBJECTS.find((x) => x.id === id)?.shortName).join("・") : "全科目"}
                  {s.scope.topicIds.length ? `・${s.scope.topicIds.length}論点` : ""}　更新 {formatDate(s.updatedAt)}　{Math.round(s.bodyMarkdown.length / 400)}ページ相当
                  {s.aiNotes && "　AI直前ポイント付き"}
                </div>
              </Link>
              <button className="btn-ghost text-xs text-red-700" onClick={() => confirm("削除しますか？") && deleteSummary(s.id)}>
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
