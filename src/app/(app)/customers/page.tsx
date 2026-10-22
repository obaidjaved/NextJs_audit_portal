import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { customers as customersRepo, audits as auditsRepo, actions as actionsRepo, schedules as schedulesRepo, users as usersRepo } from "@/lib/repo";
import { requireUser } from "@/lib/access";
import { CustomerSplitView } from "@/components/customers/CustomerSplitView";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  // Old bookmark: the "New requests" toggle moved to its own Leads tab.
  if (view === "requests") redirect("/leads");
  const user = await requireUser();

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
        <h1 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>Customers</h1>
        <Link href="/customers/new" className="btn primary">+ New Customer</Link>
      </div>

      <CustomersView isAdmin={user.role === "ADMIN"} />
    </div>
  );
}

async function CustomersView({ isAdmin }: { isAdmin: boolean }) {
  const [customers, audits, actions, schedules, staff] = await Promise.all([
    customersRepo.list(),
    auditsRepo.list({ noResponses: true }),
    actionsRepo.list(),
    schedulesRepo.list(),
    // Only administrators hand customers to auditors, so only they need the list.
    isAdmin ? usersRepo.list() : Promise.resolve([]),
  ]);

  return (
    <Suspense>
      <CustomerSplitView
        canAssign={isAdmin}
        auditors={staff.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name }))}
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          site: c.site,
          city: c.city,
          state: c.state,
          zip: c.zip,
          contact: c.contact,
          email: c.email,
          phone: c.phone,
          services: c.services,
          serviceDate: c.serviceDate,
          assignedAuditorId: c.assignedAuditorId,
          assignedAuditorName: c.assignedAuditorName,
          assignedAt: c.assignedAt?.toISOString() ?? null,
          paymentStatus: c.paymentStatus,
          projectValue: c.projectValue,
          progressStatus: c.progressStatus,
        }))}
        audits={audits.map((a) => ({
          id: a.id,
          docNumber: a.docNumber,
          customerId: a.customerId,
          title: a.title,
          date: a.date.toISOString(),
          draft: a.draft,
          pendingApproval: a.pendingApproval,
          criticalFail: a.criticalFail,
          score: a.score,
        }))}
        actions={actions.map((a) => ({
          id: a.id,
          title: a.title,
          priority: a.priority,
          status: a.status,
          dueDate: a.dueDate,
          customerId: a.customerId,
          auditDoc: a.auditDoc,
        }))}
        schedules={schedules.map((x) => ({ id: x.id, title: x.title, frequency: x.frequency, active: x.active, customerId: x.customerId, templateName: x.templateName }))}
      />
    </Suspense>
  );
}
