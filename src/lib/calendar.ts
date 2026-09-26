export interface CalendarCell {
  date: Date;
  inMonth: boolean;
}

// Monday-first, matching design-3.html's calendar (startOffset = (getDay()+6)%7).
export const CALENDAR_DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Returns a flat array of 35/42 cells (Mon-start weeks) covering the full
// weeks that overlap the given month, padded with adjacent-month days.
export function getMonthGrid(year: number, month: number): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - startOffset);

  const cells: CalendarCell[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < 42; i++) {
    cells.push({ date: new Date(cursor), inMonth: cursor.getMonth() === month });
    cursor.setDate(cursor.getDate() + 1);
  }
  // Drop the trailing week if it's entirely outside the month (keeps 5-week months compact)
  if (cells.slice(35).every((c) => !c.inMonth)) cells.length = 35;
  return cells;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
