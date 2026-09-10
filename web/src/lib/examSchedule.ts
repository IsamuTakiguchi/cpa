import { EXAM_CHECKLIST, EXAM_EVENTS, type ChecklistItem, type ExamEvent } from "@cpa/shared";

export function allEvents(): ExamEvent[] {
  return [...EXAM_EVENTS].sort((a, b) => a.date.localeCompare(b.date));
}

export function allChecklist(): ChecklistItem[] {
  return EXAM_CHECKLIST;
}

export function daysFrom(dateStr: string, now = new Date()): number {
  const target = new Date(dateStr + "T00:00:00");
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

/** 期限が今日〜withinDays 日以内、または期間中のイベント */
export function upcomingEvents(now = new Date(), withinDays = 30): (ExamEvent & { days: number })[] {
  return allEvents()
    .map((e) => ({ ...e, days: daysFrom(e.endDate ?? e.date, now) }))
    .filter((e) => e.days >= 0 && e.days <= withinDays)
    .sort((a, b) => a.days - b.days);
}

/** 未完了で期限が近い（または過ぎた）チェック項目 */
export function pendingChecklist(checks: Record<string, string> | undefined, now = new Date(), withinDays = 30) {
  return allChecklist()
    .filter((c) => c.due && !checks?.[c.id])
    .map((c) => ({ ...c, days: daysFrom(c.due!, now) }))
    .filter((c) => c.days <= withinDays)
    .sort((a, b) => a.days - b.days);
}

function ymd(d: string): string {
  return d.replace(/-/g, "");
}

function nextDay(d: string): string {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
}

/** Google カレンダーの「予定を追加」リンク（終日イベント） */
export function googleCalendarUrl(e: ExamEvent): string {
  const start = ymd(e.date);
  const end = ymd(nextDay(e.endDate ?? e.date));
  const details = [e.time, e.description, e.url].filter(Boolean).join("\n");
  const p = new URLSearchParams({ action: "TEMPLATE", text: `【CPA試験】${e.title}`, dates: `${start}/${end}`, details });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** 全イベントの iCalendar（.ics）テキスト。期限・試験日には1週間前・前日の通知付き */
export function buildIcs(events: ExamEvent[]): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//cpa-exam-app//JP", "CALSCALE:GREGORIAN", "X-WR-CALNAME:公認会計士試験 2027 手続き"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:cpa-2027-${e.id}@cpa-exam-app`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.date)}`,
      `DTEND;VALUE=DATE:${ymd(nextDay(e.endDate ?? e.date))}`,
      `SUMMARY:${esc("【CPA試験】" + e.title)}`,
      `DESCRIPTION:${esc([e.time, e.description, e.url].filter(Boolean).join("\n"))}`,
    );
    if (e.kind === "deadline" || e.kind === "exam") {
      lines.push("BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc("明日: " + e.title)}`, "END:VALARM");
      lines.push("BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", `DESCRIPTION:${esc("1週間前: " + e.title)}`, "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function formatJpDate(d: string): string {
  const x = new Date(d + "T00:00:00");
  const w = ["日", "月", "火", "水", "木", "金", "土"][x.getDay()];
  return `${x.getFullYear()}/${x.getMonth() + 1}/${x.getDate()}(${w})`;
}
