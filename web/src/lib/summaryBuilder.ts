/** まとめノート（試験前見直し用）の Markdown を生成する */
import type { Attempt, SummaryScope, TopicProgress } from "@cpa/shared";
import { feedbackMap, getQuestion, getSubject, isSingleFeedback, SUBJECTS, type Topic } from "@cpa/shared";
import { attemptScore } from "./repo";
import { latestAttemptByQuestion, missedPoints } from "./stats";

export interface SummaryInputs {
  scope: SummaryScope;
  attempts: Attempt[];
  progress: TopicProgress[];
}

export const DEFAULT_SCOPE: SummaryScope = {
  subjects: [],
  topicIds: [],
  includeNotes: "summary",
  includeCards: true,
  includeWeakQuestions: true,
  includeMyAnswers: false,
  includeMemos: true,
};

export function topicsInScope(scope: SummaryScope): Topic[] {
  const subs = new Set(scope.subjects);
  const tids = new Set(scope.topicIds);
  return SUBJECTS.flatMap((s) => s.topics).filter((t) => (subs.size === 0 || subs.has(t.subject)) && (tids.size === 0 || tids.has(t.id)));
}

export function buildSummaryMarkdown({ scope, attempts, progress }: SummaryInputs): string {
  const topics = topicsInScope(scope);
  const latest = latestAttemptByQuestion(attempts);
  const progressMap = new Map(progress.filter((p) => !p.deletedAt).map((p) => [p.id, p]));
  const lines: string[] = [];
  let currentSubject = "";
  for (const t of topics) {
    if (t.subject !== currentSubject) {
      currentSubject = t.subject;
      lines.push(`# ${getSubject(t.subject)?.name ?? t.subject}`, "");
    }
    lines.push(`## ${t.title}`, "");
    const p = progressMap.get(t.id);
    if (p?.bookmarked) lines.push("> ★ ブックマーク済み", "");
    if (scope.includeNotes === "summary") lines.push(t.summary.trim(), "");
    else if (scope.includeNotes === "full") lines.push(demoteHeadings(t.note.trim()), "");
    if (scope.includeMemos && p?.memo?.trim()) lines.push("### 自分のメモ", "", p.memo.trim(), "");
    if (scope.includeCards && t.cards.length) {
      lines.push("### 暗記カード", "", "| 問 | 答 |", "|---|---|");
      for (const c of t.cards) lines.push(`| ${cell(c.front)} | ${cell(c.back)} |`);
      lines.push("");
    }
    if (scope.includeWeakQuestions) {
      const weak: string[] = [];
      const ids = [...t.trueFalse, ...t.shortAnswers, ...t.miniEssays, ...t.essays, ...t.calcs].map((q) => q.id);
      for (const id of ids) {
        const a = latest.get(id);
        if (!a) continue;
        const q = getQuestion(id);
        if (!q) continue;
        const s = attemptScore(a);
        const ratio = s && s.max > 0 ? s.score / s.max : a.isCorrect === null ? null : a.isCorrect ? 1 : 0;
        if (ratio === null || ratio >= 0.7) continue;
        if (q.kind === "tf") weak.push(`- **正誤** ${q.q.statement} → **${q.q.answer ? "○" : "×"}** ${q.q.reason}`);
        else if (q.kind === "short") weak.push(`- **一問一答** ${q.q.question} → **${q.q.answer}**`);
        else if (q.kind === "calc") weak.push(`- **計算** ${q.q.title}: 正解 ${q.q.answers.map((x) => `${x.label} ${x.value.toLocaleString()}${x.unit ?? ""}`).join(" / ")}`);
        else if (q.kind === "mini") {
          const missed = missedPoints(a).flatMap((m) => m.points);
          weak.push(`- **小論述** ${q.q.question}（${s ? `${s.score}/${s.max}点` : ""}）`);
          if (missed.length) weak.push(...missed.map((m) => `  - 落とした採点ポイント: ${m}`));
          weak.push(`  - 模範解答: ${q.q.modelAnswer.replace(/\n+/g, " ")}`);
        } else if (q.kind === "essay") {
          weak.push(`- **大問論述** ${q.q.title}（${s ? `${s.score}/${s.max}点` : ""}）`);
          for (const m of missedPoints(a)) weak.push(`  - ${m.subLabel}: ${m.points.join(" / ")}`);
        }
      }
      if (weak.length) lines.push("### 間違えた・得点が低かった問題", "", ...weak, "");
    }
    if (scope.includeMyAnswers) {
      const mine: string[] = [];
      for (const q of [...t.miniEssays, ...t.essays]) {
        const a = latest.get(q.id);
        if (!a) continue;
        if ("subQuestions" in q) {
          const subs = (a.answer as { subs?: Record<string, string> })?.subs ?? {};
          const ai = feedbackMap(a.aiFeedback);
          mine.push(`#### ${q.title}`);
          for (const sq of q.subQuestions) {
            mine.push(`**${sq.label}** ${sq.question}`, "", "自分の答案:", "", quote(subs[sq.label] ?? "（無記入）"));
            const f = ai[sq.label];
            if (f) mine.push("", "AI講評: " + f.feedback, "", "改善答案:", "", quote(f.improvedAnswer));
            mine.push("");
          }
        } else {
          const text = (a.answer as { text?: string })?.text ?? "";
          const f = isSingleFeedback(a.aiFeedback) ? a.aiFeedback : null;
          mine.push(`#### ${q.question}`, "", "自分の答案:", "", quote(text || "（無記入）"));
          if (f) mine.push("", "AI講評: " + f.feedback, "", "改善答案:", "", quote(f.improvedAnswer));
          mine.push("");
        }
      }
      if (mine.length) lines.push("### 自分の答案と講評", "", ...mine);
    }
  }
  return lines.join("\n").trim() + "\n";
}

function cell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n+/g, " ");
}

function quote(s: string): string {
  return s
    .split("\n")
    .map((l) => "> " + l)
    .join("\n");
}

/** note の見出しは ## から始まるので、まとめ内では ### 以下に下げる */
function demoteHeadings(md: string): string {
  return md.replace(/^(#{1,5}) /gm, (_, h: string) => "#" + h + " ");
}
