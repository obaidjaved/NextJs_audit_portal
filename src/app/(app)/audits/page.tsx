import Link from "next/link";
import { audits as auditsRepo, customers as customersRepo, emailTemplates as emailTemplatesRepo } from "@/lib/repo";
import { requireUser } from "@/lib/access";
import { auditStatus } from "@/lib/scoring";
import { mergeValuesFor } from "@/lib/email-merge";
import { serviceTypesOf } from "@/lib/ops-options";
import { AuditsTable, type AuditListRow } from "@/components/audits/AuditsTable";

// The email action runs here: building the PDF and handing it to the mail server can take a while.
export const maxDuration = 60;

export default async function AuditsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const user = await requireUser();

  const [audits, customers, templates] = await Promise.all([
    auditsRepo.list({ noResponses: true }),
    customersRepo.list(),
    emailTemplatesRepo.list(),
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const rows: AuditListRow[] = audits.map((a) => {
    const c = customerById.get(a.customerId);
    const auditorName = a.inspector?.name ?? c?.assignedAuditorName ?? null;
    const services = c?.services ?? [];
    return {
      id: a.id,
      docNumber: a.docNumber,
      title: a.title,
      customerName: a.customer.name,
      email: c?.email ?? a.customer.email,
      phone: c?.phone ?? a.customer.phone,
      services,
      serviceDate: c?.serviceDate ?? null,
      auditorName,
      date: a.date.toISOString(),
      status: auditStatus(a),
      completed: !a.draft && !a.pendingApproval,
      merge: mergeValuesFor(a, { service: serviceTypesOf(services).join(", "), auditorName: auditorName ?? "" }),
    };
  });

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
        <h1 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>Audits</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {user.role === "ADMIN" && (
            <Link href="/email-templates" className="btn ghost sm">Email templates</Link>
          )}
          <a href="/api/export/audits" className="btn ghost sm">Export CSV</a>
          <Link href="/new-audit" className="btn primary sm">+ New Audit</Link>
        </div>
      </div>

      <AuditsTable
        audits={rows}
        initialQuery={q}
        canManageTemplates={user.role === "ADMIN"}
        templates={templates.map((t) => ({ id: t.id, name: t.name, subject: t.subject, body: t.body, attachReport: t.attachReport }))}
      />
    </div>
  );
}
