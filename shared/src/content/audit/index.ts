import type { SystemMap, Topic } from "../types";
import { topic as au01 } from "./topics/au01-audit-objective";
import { topic as au02 } from "./topics/au02-audit-standards";
import { topic as au03 } from "./topics/au03-risk-approach";
import { topic as au04 } from "./topics/au04-internal-control";
import { topic as au05 } from "./topics/au05-audit-evidence";
import { topic as au06 } from "./topics/au06-materiality";
import { topic as au07 } from "./topics/au07-going-concern";
import { topic as au08 } from "./topics/au08-audit-report-kam";
import { topic as au09 } from "./topics/au09-fraud";
import { topic as au10 } from "./topics/au10-quality-control-ethics";

/**
 * audit の論点一覧。topics/ 配下に論点ごとのファイルを置き、ここで配列にまとめる。
 * 新しい論点を追加するときは topics/ にファイルを作り、この配列に追加する。
 */
export const auditTopics: Topic[] = [au01, au02, au03, au04, au05, au06, au07, au08, au09, au10];

/**
 * 監査論の体系マップ。
 * 基礎概念（監査の目的・監査基準）を土台に、実施（リスク・アプローチ → 内部統制・監査証拠・重要性）、
 * 報告（継続企業の前提・監査報告書と KAM）へ流れ、不正・品質管理・倫理が全体を支える構造を示す。
 * ノード id は nodeTopics のキーと一致させる。
 */
export const auditSystemMap: SystemMap = {
  mermaid: `flowchart TD
  subgraph BASE["基礎概念：監査の目的と規範"]
    OBJ["監査の目的と限界<br/>二重責任・合理的保証・期待ギャップ"]
    STD["監査基準の体系<br/>GAAS・一般基準・正当な注意と懐疑心"]
  end
  subgraph IMPL["実施：リスク・アプローチによる証拠入手"]
    RISK["リスク・アプローチ<br/>AR ＝ RMM × DR"]
    IC["内部統制と監査<br/>5要素・運用評価・J-SOX"]
    EVID["監査証拠と監査手続<br/>十分性・適切性・確認・見積り"]
    MAT["監査上の重要性<br/>基準値・手続実施上の重要性・虚偽表示の評価"]
  end
  subgraph REP["報告：意見形成と監査報告書"]
    GC["継続企業の前提<br/>重要な不確実性・独立区分"]
    RPT["監査報告書と KAM<br/>意見の種類・除外事項・その他の記載内容"]
  end
  subgraph QC["不正・品質管理・倫理"]
    FRD["不正と監査<br/>不正リスク要因・疑義への対応・違法行為"]
    QCE["品質管理と職業倫理<br/>品質管理システム・審査・独立性・守秘義務"]
  end
  OBJ --> STD
  STD -- "実施基準" --> RISK
  RISK --> IC
  RISK --> EVID
  RISK --> MAT
  IC -- "統制リスクの評価" --> EVID
  EVID --> GC
  MAT -- "未修正の虚偽表示の評価" --> RPT
  GC --> RPT
  STD -- "報告基準" --> RPT
  FRD -. "特別な検討を必要とするリスク" .-> RISK
  FRD -. "懐疑心の強調" .-> STD
  QCE -. "一般基準：独立性・品質管理" .-> STD
  QCE -. "審査" .-> RPT
  RPT -. "期待ギャップの縮小" .-> OBJ
`,
  nodeTopics: {
    OBJ: "au-01",
    STD: "au-02",
    RISK: "au-03",
    IC: "au-04",
    EVID: "au-05",
    MAT: "au-06",
    GC: "au-07",
    RPT: "au-08",
    FRD: "au-09",
    QCE: "au-10",
  },
};
