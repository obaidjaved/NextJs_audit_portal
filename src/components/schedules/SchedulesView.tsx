import { ScheduleCalendarView, type ScheduleRow } from "./ScheduleCalendarView";

// Schedules are shown on the calendar only.
export function SchedulesView({ schedules }: { schedules: ScheduleRow[] }) {
  return <ScheduleCalendarView schedules={schedules} />;
}
