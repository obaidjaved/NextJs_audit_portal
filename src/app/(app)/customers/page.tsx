import Link from "next/link";
import { Suspense } from "react";
import { customers as customersRepo, audits as auditsRepo, actions as actionsRepo, schedules as schedulesRepo, requests as requestsRepo } from "@/lib/wp/repo";
import { requireUser } from "@/lib/access";
import { CustomerSplitView } from "@/components/customers/CustomerSplitView";
import { RequestsPanel, type RequestRow } from "@/components/customers/RequestsPanel";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const user = await requireUser();
  const showRequests = view === "requests";

  const pendingCount = await requestsRepo.pendingCount();

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
        <h1 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>Customers</h1>
        <div className="filter-row">
          <Link href="/customers" className={!showRequests ? "active" : ""}>All customers</Link>
          <Link href="/customers?view=requests" className={showRequests ? "active" : ""} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            New requests
            {pendingCount > 0 && (
              <span className="mono" style={{ background: "var(--accent)", color: "#1a0d02", borderRadius: 999, padding: "0 7px", fontSize: 10.5 }}>{pendingCount}</span>
            )}
          </Link>
        </div>
      </div>

      {showRequests ? <RequestsView canReview={user.role === "ADMIN"} /> : <CustomersView />}
    </div>
  );
}

async function RequestsView({ canReview }: { canReview: boolean }) {
  const rows = await requestsRepo.list();

  const requests: RequestRow[] = rows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    companyName: r.companyName,
    title: r.title,
    street: r.street,
    street2: r.street2,
    city: r.city,
    state: r.state,
    zip: r.zip,
    phone: r.phone,
    email: r.email,
    services: r.services,
    trainings: r.trainings,
    dateNeeded: r.dateNeeded,
    additionalInfo: r.additionalInfo,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewedBy: r.reviewedByName,
    reviewNote: r.reviewNote,
    customerId: r.customerId,
  }));

  return <RequestsPanel requests={requests} canReview={canReview} />;
}

async function CustomersView() {
  const [customers, audits, actions, schedules] = await Promise.all([
    customersRepo.list(),
    auditsRepo.list({ noResponses: true }),
    actionsRepo.list(),
    schedulesRepo.list(),
  ]);

  return (
    <Suspense>
      <CustomerSplitView
        customers={customers.map((c) => ({ id: c.id, name: c.name, site: c.site, city: c.city, state: c.state, zip: c.zip, contact: c.contact, email: c.email, phone: c.phone }))}
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
