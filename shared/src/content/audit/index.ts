import type { Topic } from "../types";
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
