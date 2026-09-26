"use client";

import { useState } from "react";
import { CalendarGrid, type CalendarEvent } from "@/components/calendar/CalendarGrid";
import { auditStatus } from "@/lib/scoring";
import type { DashboardAudit } from "@/lib/dashboard";
import { initials } from "@/lib/initials";

const STATUS_COLOR: Record<string, string> = {
  "In Progress": "--pending",
  "Pending Approval": "--pending",
  Flagged: "--danger",
  Cleared: "--ok",
  Marginal: "--warn",
};

export function DashboardCalendar({ audits }: { audits: DashboardAudit[] }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());

  const events: CalendarEvent[] = audits.map((a) => {
    const status = auditStatus(a);
    return {
      date: a.date,
      label: a.customerName.split(" ")[0],
      colorToken: STATUS_COLOR[status] ?? "--ink-2",
      initial: initials(a.customerName),
    };
  });

  return (
    <div className="card panel">
      <CalendarGrid year={year} month={month} events={events} onMonthChange={(y, m) => { setYear(y); setMonth(m); }} />
    </div>
  );
}
