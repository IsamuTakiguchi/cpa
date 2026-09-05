import type { Topic } from "../types";
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
