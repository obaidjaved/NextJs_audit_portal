import Link from "next/link";
import { schedules as schedulesRepo, audits as auditsRepo, customers as customersRepo } from "@/lib/repo";
import { requireUser } from "@/lib/access";
import { buildAuditorRows } from "@/lib/audit-rows";
import { AuditorSchedule } from "@/components/schedules/AuditorSchedule";
import { SchedulesView } from "@/components/schedules/SchedulesView";

export default async function SchedulesPage() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    const [audits, customers] = await Promise.all([auditsRepo.list({ noResponses: true }), customersRepo.list()]);
    // Open jobs assigned to this auditor, the soonest service date first (no date goes last).
    const rows = buildAuditorRows(audits, customers, user.id)
      .filter((r) => !r.approved && !r.customerCompleted && r.review !== "Pending approval")
      .sort((a, b) => (a.neededBy ?? "9999").localeCompare(b.neededBy ?? "9999"));
    return (
      <div>
        <h1 className="disp" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Schedules</h1>
        <AuditorSchedule rows={rows} />
      </div>
    );
  }

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
