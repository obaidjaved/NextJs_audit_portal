export type ScheduleFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY";

// "YYYY-MM-DD" strings (e.g. from a date input) parse as UTC midnight via
// `new Date(str)`, which shifts to the previous local calendar day west of
// UTC. Schedule dates are meant as timezone-agnostic calendar dates, so
// parse them as local midnight explicitly instead.
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// The inverse of parseLocalDate: today's date as "YYYY-MM-DD" in local time.
// `toISOString()` converts to UTC first, which can show tomorrow's date for
// anyone west of UTC in the evening — this stays anchored to local calendar.
export function todayLocalDateString(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// Schedule start dates are pure calendar dates with no time-of-day or
// timezone meaning (like a birthday) but must round-trip through a Postgres
// timestamp column via a Server Action running on a server whose local
// timezone is arbitrary (typically UTC on Vercel, but not guaranteed).
// `parseLocalDate` alone isn't enough for *storage*, because "local" there
// means the server process's zone, not the viewer's — storing that way and
// then reading it back with the viewer's own local getters can silently
// shift the date by a day. These two helpers keep storage anchored to UTC
// regardless of server config, so `dateOnlyStringUTC` always returns
// exactly the calendar date `parseDateOnlyUTC` was given.
export function parseDateOnlyUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function dateOnlyStringUTC(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export const FREQUENCY_LABEL: Record<ScheduleFrequency, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Biweekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
};

// Adds `months` to `date` without JS Date's day-of-month overflow rollover
// (e.g. Jan 31 + 1 month would otherwise silently become Mar 3, skipping
// February entirely, and every later occurrence stays shifted off the
// 31st). Clamps to the target month's actual last day instead.
function addMonthsClamped(date: Date, months: number): Date {
  const originalDay = date.getDate();
  const d = new Date(date);
  d.setDate(1); // avoid overflow while changing the month
  d.setMonth(d.getMonth() + months);
  const daysInTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDay, daysInTargetMonth));
  return d;
}

function addInterval(date: Date, frequency: ScheduleFrequency): Date {
  const d = new Date(date);
  switch (frequency) {
    case "WEEKLY":
      d.setDate(d.getDate() + 7);
      return d;
    case "BIWEEKLY":
      d.setDate(d.getDate() + 14);
      return d;
    case "MONTHLY":
      return addMonthsClamped(d, 1);
    case "QUARTERLY":
      return addMonthsClamped(d, 3);
  }
}

// The next occurrence on or after `from` (defaults to today), computed
// purely from startDate + frequency — schedules don't store due dates.
export function nextDueDate(startDate: Date, frequency: ScheduleFrequency, from: Date = new Date()): Date {
  let occurrence = new Date(startDate);
  occurrence.setHours(0, 0, 0, 0);
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  if (occurrence >= cursor) return occurrence;
  while (occurrence < cursor) occurrence = addInterval(occurrence, frequency);
  return occurrence;
}

export function isDueToday(startDate: Date, frequency: ScheduleFrequency): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return nextDueDate(startDate, frequency, today).getTime() === today.getTime();
}

// All occurrences of a schedule that fall within [rangeStart, rangeEnd] (inclusive).
export function occurrencesInRange(startDate: Date, frequency: ScheduleFrequency, rangeStart: Date, rangeEnd: Date): Date[] {
  const occurrences: Date[] = [];
  let cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  // Fast-forward close to the range instead of iterating from the epoch of startDate.
  while (cursor < rangeStart) cursor = addInterval(cursor, frequency);
  while (cursor <= rangeEnd) {
    occurrences.push(new Date(cursor));
    cursor = addInterval(cursor, frequency);
  }
  return occurrences;
}
