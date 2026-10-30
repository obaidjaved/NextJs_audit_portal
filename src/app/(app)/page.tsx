import { audits as auditsRepo, templates as templatesRepo, customers as customersRepo, requests as requestsRepo } from "@/lib/repo";
import type { DashboardAudit } from "@/lib/dashboard";
import { buildAuditRows, matchesView } from "@/lib/audit-rows";
import { ConsoleCards } from "@/components/dashboard/ConsoleCards";
import { NextSteps, type NextStep } from "@/components/dashboard/NextSteps";
import { QuickAccessAccordion } from "@/components/dashboard/QuickAccessAccordion";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { requireUser } from "@/lib/access";
import { todayKey as todayInBusinessZone } from "@/lib/schedule";

export default async function ConsolePage() {
  const user = await requireUser();
  const userName = user.name ?? user.email ?? "there";
  const firstName = userName.split(" ")[0];

  // One slow or failing list shouldn't take the whole Console down: show what loaded and "—" for the rest.
  const isAdmin = user.role === "ADMIN";
  const [auditsR, templatesR, customersR, leadsR] = await Promise.allSettled([
    auditsRepo.list({ noResponses: true }),
    templatesRepo.list(),
    customersRepo.list(),
    isAdmin ? requestsRepo.list() : Promise.resolve([]),
  ]);
  const loaded = <T,>(r: PromiseSettledResult<T[]>): T[] | null => (r.status === "fulfilled" ? r.value : null);
  const leadList = loaded(leadsR);
  const templateRows = loaded(templatesR) ?? [];
  // Auditors only see what is assigned to them: their customers, and the audits on those (or that they started).
  const allCustomers = loaded(customersR);
  const customerList = allCustomers && !isAdmin ? allCustomers.filter((c) => c.assignedAuditorId === user.id) : allCustomers;
  const mineIds = new Set((customerList ?? []).map((c) => c.id));
  const allAudits = loaded(auditsR);
  const auditList = allAudits && !isAdmin ? allAudits.filter((a) => a.inspectorId === user.id || mineIds.has(a.customerId)) : allAudits;
  const auditRows = auditList ?? [];
  const customerRows = customerList ?? [];
  const incomplete = !auditList || !customerList || !leadList || templatesR.status === "rejected";

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
  const todayKey = todayInBusinessZone();
  const lines = buildAuditRows(auditRows, customerRows);
  const countView = (view: "completed" | "unassigned" | "upcoming" | "due" | "today") =>
    auditList && customerList ? lines.filter((r) => matchesView(r, view, todayKey)).length : null;
  // What an auditor needs to act on: reports the admin sent back, and completed audits waiting to be submitted.
  const sentBack = isAdmin ? 0 : lines.filter((r) => r.review === "Needs Correction").length;
  const toSubmit = isAdmin ? 0 : lines.filter((r) => r.review === "Ready to submit").length;

  // The to-do list: only what needs attention right now.
  const waitingForReview = lines.filter((r) => r.review === "Pending approval").length;
  const notStarted = isAdmin ? 0 : lines.filter((r) => r.review === null).length;
  const steps: NextStep[] = isAdmin
    ? [
        { count: leadList ? leadList.filter((l) => l.status === "PENDING").length : 0, text: "new leads waiting for a decision", action: "Review leads", href: "/leads", urgent: true },
        { count: countView("unassigned") ?? 0, text: "customers waiting for an auditor", action: "Assign auditors", href: "/audits?view=unassigned" },
        { count: waitingForReview, text: "submitted reports waiting for your review", action: "Review reports", href: "/audits?status=Pending%20approval", urgent: true },
      ]
    : [
        { count: sentBack, text: sentBack === 1 ? "report was sent back for corrections" : "reports were sent back for corrections", action: "See instructions", href: "/audits?status=Needs%20Correction", urgent: true },
        { count: toSubmit, text: toSubmit === 1 ? "completed audit is ready to submit" : "completed audits are ready to submit", action: "Submit", href: "/audits?status=Ready%20to%20submit" },
        { count: countView("today") ?? 0, text: "audits are due today", action: "Open audits", href: "/audits?view=today", urgent: true },
        { count: notStarted, text: notStarted === 1 ? "assigned job hasn't been started" : "assigned jobs haven't been started", action: "Start an audit", href: "/audits?status=No%20audit%20yet" },
      ];

  // Auditors have no Leads or Customers tabs, so they get just their own audit numbers.
  const cards = isAdmin
    ? [
        { label: "Leads", value: leadList ? leadList.length : null, href: "/leads" },
        { label: "Customers", value: customerList ? customerList.length : null, href: "/customers" },
        { label: "Audits completed", value: countView("completed"), href: "/audits?view=completed" },
        { label: "Audits to be assigned", value: countView("unassigned"), href: "/audits?view=unassigned" },
        { label: "Audits coming up", value: countView("upcoming"), href: "/audits?view=upcoming" },
      ]
    : [
        { label: "Audits assigned", value: auditList && customerList ? lines.length : null, href: "/audits" },
        { label: "Audits completed", value: countView("completed"), href: "/audits?view=completed" },
        { label: "Audits due", value: countView("due"), href: "/audits?view=due" },
        { label: "Audits due today", value: countView("today"), href: "/audits?view=today" },
      ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="disp" style={{ fontSize: 24, fontWeight: 800 }}>Welcome back, {firstName}</h1>
        <p style={{ color: "var(--ink-2)", fontSize: 13.5, marginTop: 4 }}>Here is where things stand.</p>
      </div>

      {incomplete && (
        <p role="status" style={{ color: "var(--ink-2)", fontSize: 13 }}>
          Some figures couldn&apos;t be loaded just now (the server was slow to answer). Reload the page to try again.
        </p>
      )}

      <NextSteps steps={steps} />

      <ConsoleCards cards={cards} />

      <div className="lower-grid">
        <QuickAccessAccordion recentTemplates={recentTemplates} recentCustomers={recentCustomers} showCustomers={isAdmin} categories={categories} />
        <DashboardCalendar audits={audits} />
      </div>
    </div>
  );
}
