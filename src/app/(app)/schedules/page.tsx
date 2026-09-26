import Link from "next/link";
import { schedules as schedulesRepo } from "@/lib/wp/repo";
import { SchedulesView } from "@/components/schedules/SchedulesView";

export default async function SchedulesPage() {
  const schedules = await schedulesRepo.list();

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <h1 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>Schedules</h1>
        <Link href="/schedules/new" className="btn primary sm">+ New Schedule</Link>
      </div>

      <SchedulesView
        schedules={schedules.map((s) => ({
          id: s.id,
          title: s.title,
          templateId: s.templateId,
          templateName: s.templateName,
          customerId: s.customerId,
          customerName: s.customerName,
          frequency: s.frequency,
          // A clean calendar-date string, not a full ISO instant — see
          // parseDateOnlyUTC/dateOnlyStringUTC's comment in lib/schedule.ts.
          startDate: s.startDate,
          active: s.active,
        }))}
      />
    </div>
  );
}
