import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { Db } from "../db";
import { aiUsage } from "../db/schema";
import { ALLOWED_AI_MODELS, env } from "../env";
import type { AppEnv } from "../auth/session";
import { gradeEssay, summarizeWeakPoints } from "../ai/grader";
import { getQuestion, getSubject, getTopic } from "@cpa/shared";

const gradeBody = z.object({
  questionId: z.string(),
  /** 大問の枝問ラベル（essay のとき必須） */
  subLabel: z.string().optional(),
  answerText: z.string().max(20000),
  model: z.enum(ALLOWED_AI_MODELS).optional(),
});

const summarizeBody = z.object({
  examDate: z.string(),
  topicIds: z.array(z.string()).max(60),
  weakPoints: z
    .array(
      z.object({
        questionId: z.string(),
        subLabel: z.string().optional(),
        missedPoints: z.array(z.string()).max(10),
        score: z.number(),
        maxScore: z.number(),
      }),
    )
    .max(60),
  model: z.enum(ALLOWED_AI_MODELS).optional(),
});

async function consumeQuota(db: Db, userId: string): Promise<{ ok: boolean; used: number; limit: number }> {
  const day = new Date().toISOString().slice(0, 10);
  const [row] = await db
    .insert(aiUsage)
    .values({ userId, day, count: 1 })
    .onConflictDoUpdate({ target: [aiUsage.userId, aiUsage.day], set: { count: sql`${aiUsage.count} + 1` } })
    .returning({ count: aiUsage.count });
  const used = row?.count ?? 0;
  if (used > env.aiDailyLimit) {
    await db
      .update(aiUsage)
      .set({ count: sql`${aiUsage.count} - 1` })
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, day)));
    return { ok: false, used: used - 1, limit: env.aiDailyLimit };
  }
  return { ok: true, used, limit: env.aiDailyLimit };
}

export function aiRoutes(db: Db) {
  const app = new Hono<AppEnv>();

  app.get("/status", async (c) => {
    const user = c.get("user");
    const day = new Date().toISOString().slice(0, 10);
    const [row] = await db.select({ count: aiUsage.count }).from(aiUsage).where(and(eq(aiUsage.userId, user.id), eq(aiUsage.day, day)));
    return c.json({ enabled: env.anthropicApiKey !== "", model: env.aiModel, used: row?.count ?? 0, limit: env.aiDailyLimit, allowedModels: ALLOWED_AI_MODELS });
  });

  app.post("/grade-essay", async (c) => {
    if (!env.anthropicApiKey) return c.json({ error: "サーバーに ANTHROPIC_API_KEY が設定されていないため AI 採点は使えません" }, 503);
    const parsed = gradeBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "入力が不正です" }, 400);
    const { questionId, subLabel, answerText } = parsed.data;
    const found = getQuestion(questionId);
    if (!found || (found.kind !== "mini" && found.kind !== "essay")) return c.json({ error: "論述問題が見つかりません" }, 404);
    const subject = getSubject(found.topic.subject)!;
    let question: string;
    let modelAnswer: string;
    let points;
    let context: string | undefined;
    if (found.kind === "mini") {
      question = found.q.question;
      modelAnswer = found.q.modelAnswer;
      points = found.q.points;
    } else {
      const sq = found.q.subQuestions.find((s) => s.label === subLabel);
      if (!sq) return c.json({ error: "枝問が見つかりません" }, 404);
      question = `${sq.label} ${sq.question}`;
      modelAnswer = sq.modelAnswer;
      points = sq.points;
      context = found.q.intro;
    }
    const user = c.get("user");
    const quota = await consumeQuota(db, user.id);
    if (!quota.ok) return c.json({ error: `本日の AI 利用上限（${quota.limit}回）に達しました` }, 429);
    try {
      const feedback = await gradeEssay(env.anthropicApiKey, parsed.data.model ?? env.aiModel, {
        subjectName: subject.name,
        topicTitle: found.topic.title,
        question,
        modelAnswer,
        points,
        answerText,
        context,
      });
      return c.json({ feedback, quota });
    } catch (e) {
      console.error("[ai] grade-essay 失敗:", e);
      return c.json({ error: "AI 採点に失敗しました: " + (e as Error).message }, 502);
    }
  });

  app.post("/summarize", async (c) => {
    if (!env.anthropicApiKey) return c.json({ error: "サーバーに ANTHROPIC_API_KEY が設定されていないため AI 要約は使えません" }, 503);
    const parsed = summarizeBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "入力が不正です" }, 400);
    const user = c.get("user");
    const quota = await consumeQuota(db, user.id);
    if (!quota.ok) return c.json({ error: `本日の AI 利用上限（${quota.limit}回）に達しました` }, 429);
    const topics = parsed.data.topicIds
      .map((id) => getTopic(id))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map((t) => ({ subjectName: getSubject(t.subject)!.name, title: t.title, summary: t.summary }));
    const weakPoints = parsed.data.weakPoints
      .map((w) => {
        const found = getQuestion(w.questionId);
        if (!found || (found.kind !== "mini" && found.kind !== "essay")) return null;
        const question = found.kind === "mini" ? found.q.question : (found.q.subQuestions.find((s) => s.label === w.subLabel)?.question ?? found.q.title);
        return { subjectName: getSubject(found.topic.subject)!.name, topicTitle: found.topic.title, question, missedPoints: w.missedPoints, score: w.score, maxScore: w.maxScore };
      })
      .filter((w): w is NonNullable<typeof w> => !!w);
    try {
      const markdown = await summarizeWeakPoints(env.anthropicApiKey, parsed.data.model ?? env.aiModel, { examDate: parsed.data.examDate, topics, weakPoints });
      return c.json({ markdown, quota });
    } catch (e) {
      console.error("[ai] summarize 失敗:", e);
      return c.json({ error: "AI 要約に失敗しました: " + (e as Error).message }, 502);
    }
  });

  return app;
}
