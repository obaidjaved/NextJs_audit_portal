import { templates as templatesRepo, customers as customersRepo } from "@/lib/repo";
import { ScheduleForm } from "@/components/schedules/ScheduleForm";

export default async function NewSchedulePage() {
  const [templates, customers] = (await Promise.all([templatesRepo.list(), customersRepo.list()])).map((list) =>
    list.map((x) => ({ id: x.id, name: x.name })).sort((a, b) => a.name.localeCompare(b.name)),
  );

  return (
    <div>
      <h1 className="disp" style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
        New Schedule
      </h1>
      <ScheduleForm templates={templates} customers={customers} />
    </div>
  );
}
