"use client";

import { useMemo, useState } from "react";
import { CalendarGrid, type CalendarEvent } from "@/components/calendar/CalendarGrid";
import { occurrencesInRange, parseLocalDate, type ScheduleFrequency } from "@/lib/schedule";
import { initials } from "@/lib/initials";

export interface ScheduleRow {
  id: string;
  title: string;
  templateId: string;
  templateName: string;
  customerId: string;
  customerName: string;
  frequency: ScheduleFrequency;
  startDate: string; // "YYYY-MM-DD" date-only, not a full ISO instant
  active: boolean;
}

export function ScheduleCalendarView({ schedules }: { schedules: ScheduleRow[] }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());

  const events: CalendarEvent[] = useMemo(() => {
    const rangeStart = new Date(year, month, 1);
    const rangeEnd = new Date(year, month + 1, 0);
    const result: CalendarEvent[] = [];
    for (const s of schedules) {
      if (!s.active) continue;
      const occurrences = occurrencesInRange(parseLocalDate(s.startDate), s.frequency, rangeStart, rangeEnd);
      for (const date of occurrences) {
        result.push({ date, label: s.customerName.split(" ")[0], colorToken: "--accent", initial: initials(s.customerName) });
      }
    }
    return result;
  }, [schedules, year, month]);

  return (
    <div className="card panel">
      <CalendarGrid year={year} month={month} events={events} onMonthChange={(y, m) => { setYear(y); setMonth(m); }} />
    </div>
  );
}
