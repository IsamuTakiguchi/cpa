import type { SystemMap, Topic } from "../types";
import { topic as ma01 } from "./topics/ma01-cost-accounting-standards";
import { topic as ma02 } from "./topics/ma02-standard-costing";
import { topic as ma03 } from "./topics/ma03-direct-costing";
import { topic as ma04 } from "./topics/ma04-cvp-analysis";
import { topic as ma05 } from "./topics/ma05-budgeting";
import { topic as ma06 } from "./topics/ma06-divisional-performance";
import { topic as ma07 } from "./topics/ma07-decision-making";
import { topic as ma08 } from "./topics/ma08-strategic-management-accounting";

/**
 * managerial の論点一覧。topics/ 配下に論点ごとのファイルを置き、ここで配列にまとめる。
 * 新しい論点を追加するときは topics/ にファイルを作り、この配列に追加する。
 */
export const managerialTopics: Topic[] = [ma01, ma02, ma03, ma04, ma05, ma06, ma07, ma08];

/**
 * 科目の体系マップ（Mermaid）。ノード id は nodeTopics のキーと一致させること。
 * 原価計算の基礎 → 原価管理（標準原価・予算）→ 利益管理（直接原価・CVP）→ 業績評価・意思決定 → 戦略的管理会計 の流れ。
 */
export const managerialSystemMap: SystemMap = {
  mermaid: `flowchart TD
  subgraph BASE["原価計算の基礎"]
    MA01["原価計算基準総論と原価の分類<br/>目的・原価の本質・分類・非原価項目"]
  end
  subgraph CTRL["原価管理"]
    MA02["標準原価計算と差異分析"]
    MA05["予算管理<br/>編成・統制・差異分析"]
  end
  subgraph PROF["利益管理"]
    MA03["直接原価計算<br/>固変分解・固定費調整"]
    MA04["CVP分析<br/>損益分岐点・安全余裕率"]
  end
  subgraph EVAL["業績評価・意思決定"]
    MA06["業績評価と事業部制<br/>ROI・RI・EVA・振替価格"]
    MA07["意思決定会計<br/>差額原価・設備投資"]
  end
  subgraph STRAT["戦略的管理会計"]
    MA08["ABC・原価企画・BSC・品質原価・TOC"]
  end
  MA01 -- "原価管理目的・標準原価" --> MA02
  MA01 -- "操業度との関連による分類" --> MA03
  MA02 -- "標準は予算編成の基礎" --> MA05
  MA03 -- "貢献利益" --> MA04
  MA04 -- "利益計画" --> MA05
  MA05 -- "予算差異で業績評価" --> MA06
  MA03 -. "セグメント・マージン" .-> MA06
  MA03 -. "差額原価・貢献利益" .-> MA07
  MA01 -. "特殊原価調査" .-> MA07
  MA06 -- "財務指標の限界を補う" --> MA08
  MA02 -. "標準原価計算の限界を補完" .-> MA08
`,
  nodeTopics: {
    MA01: "ma-01",
    MA02: "ma-02",
    MA03: "ma-03",
    MA04: "ma-04",
    MA05: "ma-05",
    MA06: "ma-06",
    MA07: "ma-07",
    MA08: "ma-08",
  },
};
