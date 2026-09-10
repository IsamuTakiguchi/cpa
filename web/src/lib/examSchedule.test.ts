import { describe, expect, it } from "vitest";
import { EXAM_CHECKLIST, EXAM_EVENTS, EXAM_TIMETABLE } from "@cpa/shared";
import { buildIcs, googleCalendarUrl, pendingChecklist, upcomingEvents } from "./examSchedule";

describe("試験日程データ（短答式免除者・論文式3科目）", () => {
  it("id が一意で日付が有効、短答式の出願・試験は含まない", () => {
    const ids = new Set<string>();
    for (const e of EXAM_EVENTS) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(Number.isNaN(new Date(e.date + "T00:00:00").getTime())).toBe(false);
      if (e.endDate) expect(e.endDate >= e.date).toBe(true);
      expect(e.title.includes("第Ⅰ回短答式"), e.id).toBe(false);
    }
    for (const c of EXAM_CHECKLIST) {
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
      if (c.eventId) expect(EXAM_EVENTS.some((e) => e.id === c.eventId)).toBe(true);
    }
    expect(EXAM_EVENTS.some((e) => e.date === "2026-12-13")).toBe(false);
  });

  it("2026-09-09 時点では30日以内の期限が無い", () => {
    const now = new Date("2026-09-09T09:00:00");
    expect(upcomingEvents(now, 30)).toEqual([]);
    expect(pendingChecklist({}, now, 30)).toEqual([]);
  });

  it("2027-01-10 時点では免除申請期限と受験案内の公表が迫り、出願が近い", () => {
    const now = new Date("2027-01-10T09:00:00");
    const up = upcomingEvents(now, 30);
    expect(up.map((e) => e.id)).toContain("exempt-apply");
    expect(up.map((e) => e.id)).toContain("t2-guide");
    const pend = pendingChecklist({}, now, 60);
    expect(pend.map((c) => c.id)).toContain("c-apply");
    expect(pendingChecklist({ "c-notice": "2026-12-01" }, now, 60).some((c) => c.id === "c-notice")).toBe(false);
  });

  it("論文式の時間割は 8/20 監査論・租税法、8/21 会計学、8/22 は出席不要", () => {
    const day1 = EXAM_TIMETABLE.filter((r) => r.date === "2027-08-20");
    expect(day1.map((r) => r.subject)).toEqual(["監査論", "租税法"]);
    expect(day1.every((r) => r.attend)).toBe(true);
    const day2 = EXAM_TIMETABLE.filter((r) => r.date === "2027-08-21");
    expect(day2.length).toBe(2);
    expect(day2.every((r) => r.attend && r.subject.startsWith("会計学"))).toBe(true);
    const day3 = EXAM_TIMETABLE.filter((r) => r.date === "2027-08-22");
    expect(day3.length).toBeGreaterThan(0);
    expect(day3.every((r) => !r.attend)).toBe(true);
  });

  it("カレンダー用の出力ができる", () => {
    const e = EXAM_EVENTS.find((x) => x.id === "ron-day1")!;
    const url = googleCalendarUrl(e);
    expect(url).toContain("dates=20270820%2F20270821");
    const ics = buildIcs(EXAM_EVENTS);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270820");
    expect(ics.split("BEGIN:VEVENT").length - 1).toBe(EXAM_EVENTS.length);
  });
});
