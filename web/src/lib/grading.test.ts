import { describe, expect, it } from "vitest";
import { checkCalc, checkShortAnswer, parseNumber, selfScore } from "./grading";

describe("採点ロジック", () => {
  it("一問一答は表記ゆれを吸収して部分一致", () => {
    expect(checkShortAnswer("意思決定との関連性", ["関連性", "レリバンス"])).toBe(true);
    expect(checkShortAnswer("れりばんす", ["レリバンス"])).toBe(false);
    expect(checkShortAnswer("レリバンス（関連性）", ["レリバンス"])).toBe(true);
    expect(checkShortAnswer("　", ["x"])).toBe(false);
    expect(checkShortAnswer("ＲＩＳＫ", ["risk"])).toBe(true);
  });
  it("数値の解釈", () => {
    expect(parseNumber("1,234")).toBe(1234);
    expect(parseNumber("１２３４円")).toBe(1234);
    expect(parseNumber("▲500")).toBe(-500);
    expect(parseNumber("(500)")).toBe(-500);
    expect(parseNumber("-12.5")).toBe(-12.5);
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
  });
  it("計算問題の許容誤差", () => {
    const answers = [
      { label: "a", value: 17000 },
      { label: "b", value: 33.33, tolerance: 0.01 },
    ];
    expect(checkCalc(["17,000", "33.34"], answers)).toEqual({ perAnswer: [true, true], allCorrect: true });
    expect(checkCalc(["17000", "33.4"], answers).allCorrect).toBe(false);
  });
  it("自己採点の合計", () => {
    const points = [
      { text: "a", score: 4 },
      { text: "b", score: 3 },
      { text: "c", score: 3 },
    ];
    expect(selfScore(points, [0, 2])).toBe(7);
    expect(selfScore(points, [])).toBe(0);
  });
});
