import type { Topic } from "../types";
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
