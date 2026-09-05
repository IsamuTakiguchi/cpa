import type { Topic } from "../types";
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
