import type { CalcAnswer, GradingPoint } from "@cpa/shared";

/** 全角→半角・空白除去・小文字化して比較しやすくする */
export function normalizeText(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\s　]/g, "")
    .replace(/[・･]/g, "")
    .toLowerCase();
}

/** 一問一答: 受理キーワードのいずれかを含めば正解 */
export function checkShortAnswer(input: string, acceptedKeywords: string[]): boolean {
  const n = normalizeText(input);
  if (n === "") return false;
  return acceptedKeywords.some((k) => {
    const nk = normalizeText(k);
    return nk !== "" && n.includes(nk);
  });
}

/** 数値入力の解釈。「1,234」「1234円」「▲500」「-500」「(500)」を受け付ける */
export function parseNumber(input: string): number | null {
  let s = input.normalize("NFKC").trim();
  if (s === "") return null;
  let negative = false;
  if (/^[(（].*[)）]$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/^[▲△-]/.test(s)) {
    negative = !negative;
    s = s.slice(1);
  }
  s = s.replace(/[,，]/g, "").replace(/[^\d.]/g, "");
  if (s === "" || s === ".") return null;
  const v = Number(s);
  if (!Number.isFinite(v)) return null;
  return negative ? -v : v;
}

export function checkCalcAnswer(input: string, expected: CalcAnswer): boolean {
  const v = parseNumber(input);
  if (v === null) return false;
  const tol = expected.tolerance ?? 0;
  return Math.abs(v - expected.value) <= tol + 1e-9;
}

export function checkCalc(inputs: string[], answers: CalcAnswer[]): { perAnswer: boolean[]; allCorrect: boolean } {
  const perAnswer = answers.map((a, i) => checkCalcAnswer(inputs[i] ?? "", a));
  return { perAnswer, allCorrect: perAnswer.every(Boolean) };
}

/** 自己採点: チェックした採点ポイントの配点合計 */
export function selfScore(points: GradingPoint[], checked: number[]): number {
  return checked.reduce((s, i) => s + (points[i]?.score ?? 0), 0);
}

export function maxScore(points: GradingPoint[]): number {
  return points.reduce((s, p) => s + p.score, 0);
}

export function formatNumber(v: number): string {
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 4 }).format(v);
}
