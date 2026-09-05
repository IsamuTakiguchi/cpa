import { describe, expect, it } from "vitest";
import { isDue, newCardState, review } from "./srs";

describe("SRS", () => {
  const now = new Date("2026-09-01T10:00:00Z");
  it("新規カードは即時期限", () => {
    const s = newCardState("c1", "fa-01", "financial", "d", now);
    expect(isDue(s, now)).toBe(true);
  });
  it("正解を重ねると間隔が伸び、もう一度で戻る", () => {
    let s = newCardState("c1", "fa-01", "financial", "d", now);
    s = review(s, 2, "d", now);
    expect(s.intervalDays).toBe(1);
    s = review(s, 2, "d", now);
    expect(s.intervalDays).toBe(4);
    s = review(s, 3, "d", now);
    expect(s.intervalDays).toBeGreaterThan(4);
    const before = s.intervalDays;
    s = review(s, 0, "d", now);
    expect(s.intervalDays).toBe(0);
    expect(s.lapses).toBe(1);
    expect(s.ease).toBeLessThan(2.5);
    expect(before).toBeGreaterThan(0);
    expect(isDue(s, new Date(now.getTime() + 11 * 60000))).toBe(true);
  });
  it("間隔は180日を上限とする", () => {
    let s = newCardState("c1", "fa-01", "financial", "d", now);
    for (let i = 0; i < 20; i++) s = review(s, 3, "d", now);
    expect(s.intervalDays).toBeLessThanOrEqual(180);
  });
});
