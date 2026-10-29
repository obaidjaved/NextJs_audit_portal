import { templates as templatesRepo, customers as customersRepo } from "@/lib/repo";
import { requireUser } from "@/lib/access";
import { NewAuditPicker } from "@/components/audit-form/NewAuditPicker";

export default async function NewAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; templateId?: string }>;
}) {
  const { customerId, templateId } = await searchParams;
  const user = await requireUser();

  const [customerRows, templateRows] = await Promise.all([customersRepo.list(), templatesRepo.list()]);
  // Auditors only see the customers the administrator assigned to them.
  const customers = customerRows
    .filter((c) => user.role === "ADMIN" || c.assignedAuditorId === user.id)
    .map((c) => ({ id: c.id, name: c.name, site: c.site }));
  const templates = templateRows.map((t) => ({ id: t.id, name: t.name, category: t.category }));

  return (
    <div>
      <h1 className="disp" style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
        New Audit
      </h1>
      <NewAuditPicker
        customers={customers}
        templates={templates}
        isAdmin={user.role === "ADMIN"}
        initialCustomerId={customerId && customers.some((c) => c.id === customerId) ? customerId : undefined}
        initialTemplateId={templateId}
      />
    </div>
  );
}
