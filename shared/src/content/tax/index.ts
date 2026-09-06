import type { SystemMap, Topic } from "../types";
import { topic as tx01 } from "./topics/tx01-corporate-income-structure";
import { topic as tx02 } from "./topics/tx02-depreciation-deferred-assets";
import { topic as tx03 } from "./topics/tx03-director-compensation";
import { topic as tx04 } from "./topics/tx04-entertainment-donation-taxes";
import { topic as tx05 } from "./topics/tx05-dividend-exclusion-tax-credits";
import { topic as tx06 } from "./topics/tx06-losses-baddebt-reserves";
import { topic as tx07 } from "./topics/tx07-income-classification";
import { topic as tx08 } from "./topics/tx08-deductions-tax-calc-withholding";
import { topic as tx09 } from "./topics/tx09-consumption-tax-scope-input-credit";
import { topic as tx10 } from "./topics/tx10-consumption-tax-payable-simplified";

/**
 * tax の論点一覧。topics/ 配下に論点ごとのファイルを置き、ここで配列にまとめる。
 * 新しい論点を追加するときは topics/ にファイルを作り、この配列に追加する。
 */
export const taxTopics: Topic[] = [tx01, tx02, tx03, tx04, tx05, tx06, tx07, tx08, tx09, tx10];

/**
 * 科目の体系マップ（Mermaid）。ノード id は nodeTopics のキーと一致させること。
 * 法人税（課税所得計算の基本構造 → 損金の別段の定め → 益金・税額 → 欠損金等）、
 * 所得税（所得区分 → 所得控除・税額計算）、消費税（課税の対象 → 納付税額）の 3 本柱で構成する。
 */
export const taxSystemMap: SystemMap = {
  mermaid: `flowchart TD
  subgraph CORP["法人税"]
    TX01["課税所得計算の基本構造<br/>益金・損金・確定決算主義・別表四"]
    subgraph LOSS["損金の別段の定め（加算項目）"]
      TX02["減価償却・繰延資産<br/>資本的支出"]
      TX03["役員給与"]
      TX04["交際費・寄附金<br/>租税公課"]
    end
    subgraph GAIN["益金不算入・税額控除"]
      TX05["受取配当等の益金不算入<br/>所得税額控除・外国税額控除"]
    end
    TX06["欠損金・貸倒れ・貸倒引当金<br/>圧縮記帳・グループ法人税制"]
  end
  subgraph INC["所得税"]
    TX07["所得区分と各種所得<br/>損益通算"]
    TX08["所得控除・税額計算<br/>源泉徴収"]
  end
  subgraph CT["消費税"]
    TX09["課税の対象<br/>仕入税額控除"]
    TX10["納付税額の計算<br/>簡易課税・中間申告"]
  end
  TX01 -- "損金不算入 → 加算" --> LOSS
  TX01 -- "益金不算入 → 減算・税額控除" --> GAIN
  LOSS --> TX06
  GAIN --> TX06
  TX07 -- "課税標準" --> TX08
  TX09 -- "課税標準額・控除対象仕入税額" --> TX10
  TX08 -. "源泉徴収された所得税の精算" .-> TX05
`,
  nodeTopics: {
    TX01: "tx-01",
    TX02: "tx-02",
    TX03: "tx-03",
    TX04: "tx-04",
    TX05: "tx-05",
    TX06: "tx-06",
    TX07: "tx-07",
    TX08: "tx-08",
    TX09: "tx-09",
    TX10: "tx-10",
  },
};
