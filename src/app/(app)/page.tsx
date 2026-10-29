import { audits as auditsRepo, templates as templatesRepo, customers as customersRepo, requests as requestsRepo } from "@/lib/repo";
import type { DashboardAudit } from "@/lib/dashboard";
import { buildAuditRows, matchesView } from "@/lib/audit-rows";
import { ConsoleCards } from "@/components/dashboard/ConsoleCards";
import { QuickAccessAccordion } from "@/components/dashboard/QuickAccessAccordion";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { requireUser } from "@/lib/access";
import { dateOnlyStringUTC } from "@/lib/schedule";

export default async function ConsolePage() {
  const user = await requireUser();
  const userName = user.name ?? user.email ?? "there";
  const firstName = userName.split(" ")[0];

  const [auditRows, templateRows, customerRows, leadRows] = await Promise.all([
    auditsRepo.list({ noResponses: true }),
    templatesRepo.list(),
    customersRepo.list(),
    requestsRepo.list(),
  ]);

  const recentTemplates = [...templateRows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 4).map((t) => ({ id: t.id, name: t.name }));
  const recentCustomers = [...customerRows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 4).map((c) => ({ id: c.id, name: c.name }));
  const categoryCounts = new Map<string, number>();
  for (const t of templateRows) categoryCounts.set(t.category, (categoryCounts.get(t.category) ?? 0) + 1);
  const categories = Array.from(categoryCounts.entries()).map(([name, count]) => ({ name, count }));

  const audits: DashboardAudit[] = auditRows.map((a) => ({
    id: a.id,
    docNumber: a.docNumber,
    title: a.title,
    customerName: a.customer.name,
    customerId: a.customerId,
    date: a.date,
    draft: a.draft,
    pendingApproval: a.pendingApproval,
    criticalFail: a.criticalFail,
    score: a.score,
  }));

  // The five numbers. They count the same lines as the Audits tab, so each card matches the list it opens.
  const todayKey = dateOnlyStringUTC(new Date());
  const lines = buildAuditRows(auditRows, customerRows);
  const cards = [
    { label: "Leads", value: leadRows.length, href: "/leads" },
    { label: "Customers", value: customerRows.length, href: "/customers" },
    { label: "Audits completed", value: lines.filter((r) => matchesView(r, "completed", todayKey)).length, href: "/audits?view=completed" },
    { label: "Audits to be assigned", value: lines.filter((r) => matchesView(r, "unassigned", todayKey)).length, href: "/audits?view=unassigned" },
    { label: "Audits coming up", value: lines.filter((r) => matchesView(r, "upcoming", todayKey)).length, href: "/audits?view=upcoming" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="disp" style={{ fontSize: 24, fontWeight: 800 }}>Welcome back, {firstName}</h1>
        <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginTop: 4 }}>Here is where things stand.</p>
      </div>

      <ConsoleCards cards={cards} />

      <div className="lower-grid">
        <QuickAccessAccordion recentTemplates={recentTemplates} recentCustomers={recentCustomers} categories={categories} />
        <DashboardCalendar audits={audits} />
      </div>
    </div>
  );
}
