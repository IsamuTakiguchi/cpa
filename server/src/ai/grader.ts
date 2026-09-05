import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { AiFeedback, GradingPoint } from "@cpa/shared";

const pointResultSchema = z.object({
  index: z.number().int().describe("採点ポイントの番号（0始まり）"),
  score: z.number().describe("この採点ポイントに与える点数（0〜配点）"),
  comment: z.string().describe("なぜその点数か。答案のどの記述が該当／不足か"),
});

const gradeSchema = z.object({
  pointResults: z.array(pointResultSchema),
  feedback: z.string().describe("総合講評。良い点、不足している論点、論理の飛躍、用語の誤りを具体的に。300字程度"),
  improvedAnswer: z.string().describe("受験生の答案を活かしつつ満点になるよう書き直した改善答案"),
});

export interface GradeInput {
  subjectName: string;
  topicTitle: string;
  question: string;
  modelAnswer: string;
  points: GradingPoint[];
  answerText: string;
  /** 参考資料（大問の intro など） */
  context?: string;
}

const SYSTEM = `あなたは公認会計士試験（論文式）の採点官です。日本の会計基準・監査基準・税法に精通し、受験生の答案を採点基準に忠実に、しかし教育的に採点します。
- 採点ポイントごとに、答案に該当する記述があるかを判定し、部分点も認めます（配点を超えない）。
- キーワードの丸暗記だけでなく、論理のつながり（趣旨→結論）が書けているかを重視します。
- 講評は具体的に。答案の表現を引用して指摘し、次に書くべき文を示します。
- 改善答案は受験生が本試験で書ける長さ（枝問なら200〜400字）に収めます。`;

export async function gradeEssay(apiKey: string, model: string, input: GradeInput): Promise<AiFeedback> {
  const client = new Anthropic({ apiKey });
  const maxScore = input.points.reduce((s, p) => s + p.score, 0);
  const pointsText = input.points.map((p, i) => `${i}. [${p.score}点] ${p.text}`).join("\n");
  const user = `# 科目・論点
${input.subjectName} / ${input.topicTitle}
${input.context ? `\n# 資料・前提\n${input.context}\n` : ""}
# 問題
${input.question}

# 模範解答
${input.modelAnswer}

# 採点ポイント（番号・配点・観点）満点 ${maxScore} 点
${pointsText}

# 受験生の答案
${input.answerText.trim() === "" ? "（無記入）" : input.answerText}

上記の採点ポイントごとに点数とコメントを付け、総合講評と改善答案を作成してください。`;

  const response = await client.messages.parse({
    model,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(gradeSchema) },
  });
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("AI の採点結果を解析できませんでした");
  return toFeedback(model, input.points, parsed);
}

export function toFeedback(model: string, points: GradingPoint[], parsed: z.infer<typeof gradeSchema>): AiFeedback {
  const pointResults = points.map((p, i) => {
    const r = parsed.pointResults.find((x) => x.index === i);
    const score = Math.max(0, Math.min(p.score, r ? Math.round(r.score * 2) / 2 : 0));
    return { text: p.text, score, maxScore: p.score, comment: r?.comment ?? "（判定なし）" };
  });
  const score = pointResults.reduce((s, p) => s + p.score, 0);
  const maxScore = points.reduce((s, p) => s + p.score, 0);
  return { model, score, maxScore, pointResults, feedback: parsed.feedback, improvedAnswer: parsed.improvedAnswer, gradedAt: new Date().toISOString() };
}

export interface SummarizeInput {
  examDate: string;
  topics: { subjectName: string; title: string; summary: string }[];
  weakPoints: { subjectName: string; topicTitle: string; question: string; missedPoints: string[]; score: number; maxScore: number }[];
}

const SUMMARY_SYSTEM = `あなたは公認会計士試験（論文式）の講師です。受験生の学習履歴（間違えた採点ポイント）と論点の要約を受け取り、
試験直前に読み返す「直前確認ポイント」を Markdown で作成します。
- 見出しは「## 」を使い、科目ごとにまとめる。
- 各項目は「結論を一文で書けるか」という形で、答案に書くべき表現を太字で示す。
- 弱点（落とした採点ポイント）は最優先で、なぜ落としやすいかと正しい書き方を対にして示す。
- 全体で1,500〜2,500字。冗長な前置きは不要。`;

export async function summarizeWeakPoints(apiKey: string, model: string, input: SummarizeInput): Promise<string> {
  const client = new Anthropic({ apiKey });
  const topicsText = input.topics.map((t) => `- [${t.subjectName}] ${t.title}: ${t.summary.replace(/\n/g, " ")}`).join("\n");
  const weakText =
    input.weakPoints.length === 0
      ? "（記録なし）"
      : input.weakPoints
          .map((w) => `- [${w.subjectName}/${w.topicTitle}] ${w.score}/${w.maxScore}点 問題: ${w.question.slice(0, 120)}\n  落とした採点ポイント: ${w.missedPoints.join(" / ")}`)
          .join("\n");
  const user = `試験日: ${input.examDate}

# 対象論点の要約
${topicsText}

# 受験生が落とした採点ポイント（直近）
${weakText}

上記をもとに「直前確認ポイント」を作成してください。`;
  const response = await client.messages.create({
    model,
    max_tokens: 6000,
    system: SUMMARY_SYSTEM,
    messages: [{ role: "user", content: user }],
  });
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
