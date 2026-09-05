import { describe, expect, it } from "vitest";
import { toFeedback } from "./grader";

describe("AI 採点結果の整形", () => {
  const points = [
    { text: "A", score: 4 },
    { text: "B", score: 3 },
    { text: "C", score: 3 },
  ];
  it("配点を超えず、欠けたポイントは0点、0.5点刻みに丸める", () => {
    const fb = toFeedback("claude-opus-5", points, {
      pointResults: [
        { index: 0, score: 9, comment: "over" },
        { index: 1, score: 1.3, comment: "partial" },
      ],
      feedback: "ok",
      improvedAnswer: "better",
    });
    expect(fb.pointResults.map((p) => p.score)).toEqual([4, 1.5, 0]);
    expect(fb.score).toBe(5.5);
    expect(fb.maxScore).toBe(10);
    expect(fb.pointResults[2]!.comment).toContain("判定なし");
  });
});
