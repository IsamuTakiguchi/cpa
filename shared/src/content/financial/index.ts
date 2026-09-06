import type { SystemMap, Topic } from "../types";
import { topic as fa01 } from "./topics/fa01-conceptual-framework";
import { topic as fa02 } from "./topics/fa02-revenue-recognition";
import { topic as fa03 } from "./topics/fa03-financial-instruments";
import { topic as fa04 } from "./topics/fa04-lease-accounting";
import { topic as fa05 } from "./topics/fa05-impairment";
import { topic as fa06 } from "./topics/fa06-retirement-benefits";
import { topic as fa07 } from "./topics/fa07-tax-effect-accounting";
import { topic as fa08 } from "./topics/fa08-business-combinations";
import { topic as fa09 } from "./topics/fa09-consolidation";
import { topic as fa10 } from "./topics/fa10-foreign-currency";
import { topic as fa11 } from "./topics/fa11-aro-and-provisions";
import { topic as fa12 } from "./topics/fa12-stock-options-and-changes";

/**
 * 財務会計論の論点一覧。topics/ 配下に論点ごとのファイルを置き、ここで配列にまとめる。
 * 新しい論点を追加するときは topics/ にファイルを作り、この配列に追加する。
 */
export const financialTopics: Topic[] = [fa01, fa02, fa03, fa04, fa05, fa06, fa07, fa08, fa09, fa10, fa11, fa12];

/**
 * 財務会計論の体系マップ。
 * 概念フレームワーク（基礎概念）を土台に、認識・測定の各論（資産・負債・収益）と、
 * 企業集団の会計（企業結合・連結・外貨）、その他（税効果・変更）へ広がる構造を示す。
 * ノード id は nodeTopics のキーと一致させる。
 */
export const financialSystemMap: SystemMap = {
  mermaid: `flowchart TD
  CF["概念フレームワーク<br/>目的・質的特性・構成要素・認識と測定"]
  subgraph REC["収益と費用の認識"]
    REV["収益認識<br/>5ステップ"]
    SO["ストック・オプション／会計上の変更"]
  end
  subgraph ASSET["資産の評価"]
    FI["金融商品<br/>有価証券・デリバティブ・ヘッジ"]
    LEASE["リース会計<br/>使用権資産／リース負債"]
    IMP["固定資産の減損"]
  end
  subgraph LIAB["負債の認識"]
    RB["退職給付"]
    ARO["資産除去債務・引当金"]
    TAX["税効果会計"]
  end
  subgraph GROUP["企業集団の会計"]
    BC["企業結合<br/>取得・のれん"]
    CONS["連結財務諸表<br/>資本連結・持分法"]
    FX["外貨換算"]
  end
  CF --> REC
  CF --> ASSET
  CF --> LIAB
  CF --> GROUP
  REV -.収益に対応する原価.-> ASSET
  FI -.時価評価と純利益／OCI.-> CF
  BC --> CONS
  CONS --> FX
  TAX -.一時差異.-> LIAB
`,
  nodeTopics: {
    CF: "fa-01",
    REV: "fa-02",
    FI: "fa-03",
    LEASE: "fa-04",
    IMP: "fa-05",
    RB: "fa-06",
    TAX: "fa-07",
    BC: "fa-08",
    CONS: "fa-09",
    FX: "fa-10",
    ARO: "fa-11",
    SO: "fa-12",
  },
};
