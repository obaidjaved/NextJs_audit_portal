"use client";

import { useState } from "react";
import { ScheduleList, type ScheduleRow } from "./ScheduleList";
import { ScheduleCalendarView } from "./ScheduleCalendarView";

export function SchedulesView({ schedules }: { schedules: ScheduleRow[] }) {
  const [tab, setTab] = useState<"list" | "calendar">("list");

  return (
    <div>
      <div className="seg-toggle" style={{ maxWidth: 280, margin: "0 0 20px" }}>
        <button type="button" className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}>
          List
        </button>
        <button type="button" className={tab === "calendar" ? "active" : ""} onClick={() => setTab("calendar")}>
          Calendar
        </button>
      </div>

      {tab === "list" ? <ScheduleList schedules={schedules} /> : <ScheduleCalendarView schedules={schedules} />}
    </div>
  );
}
