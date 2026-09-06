import { describe, expect, it } from "vitest";
import { EXAM_CHECKLIST, EXAM_EVENTS } from "@cpa/shared";
import { buildIcs, eventsForTrack, googleCalendarUrl, pendingChecklist, upcomingEvents } from "./examSchedule";

describe("試験日程データ", () => {
  it("id が一意で日付が有効", () => {
    const ids = new Set<string>();
    for (const e of EXAM_EVENTS) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(Number.isNaN(new Date(e.date + "T00:00:00").getTime())).toBe(false);
      if (e.endDate) expect(e.endDate >= e.date).toBe(true);
    }
    for (const c of EXAM_CHECKLIST) {
      expect(ids.has(c.id)).toBe(false);
      ids.add(c.id);
      if (c.eventId) expect(EXAM_EVENTS.some((e) => e.id === c.eventId)).toBe(true);
    }
  });

  it("受験区分で絞り込める", () => {
    expect(eventsForTrack("exempt").some((e) => e.id === "t1-apply")).toBe(false);
    expect(eventsForTrack("exempt").some((e) => e.id === "t2-apply")).toBe(true);
    expect(eventsForTrack("tanto1").some((e) => e.id === "t1-apply")).toBe(true);
    expect(eventsForTrack("").length).toBe(EXAM_EVENTS.length);
  });

  it("2026-09-06 時点で第Ⅰ回短答式の出願期限が迫っている", () => {
    const now = new Date("2026-09-06T09:00:00");
    const up = upcomingEvents("tanto1", now, 30);
    expect(up[0]?.id).toBe("t1-apply");
    expect(up[0]?.days).toBe(11);
    const pend = pendingChecklist("tanto1", {}, now, 30);
    expect(pend.some((c) => c.id === "c-apply1")).toBe(true);
    expect(pendingChecklist("tanto1", { "c-apply1": "2026-09-01" }, now, 30).some((c) => c.id === "c-apply1")).toBe(false);
  });

  it("カレンダー用の出力ができる", () => {
    const e = EXAM_EVENTS.find((x) => x.id === "ron-exam")!;
    const url = googleCalendarUrl(e);
    expect(url).toContain("dates=20270820%2F20270823");
    const ics = buildIcs(EXAM_EVENTS);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270820");
    expect(ics.split("BEGIN:VEVENT").length - 1).toBe(EXAM_EVENTS.length);
  });
});
