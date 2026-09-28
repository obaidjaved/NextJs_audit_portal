import { audits as auditsRepo, templates as templatesRepo, customers as customersRepo, actions as actionsRepo } from "@/lib/repo";
import {
  computeHeroMetrics,
  computeWeekCounts,
  computeScoreRing,
  computeFleetHealth,
  pickFeatured,
  type DashboardAudit,
} from "@/lib/dashboard";
import { Hero } from "@/components/dashboard/Hero";
import { FeatureCard } from "@/components/dashboard/FeatureCard";
import { WeekChart } from "@/components/dashboard/WeekChart";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { FleetHealth } from "@/components/dashboard/FleetHealth";
import { QuickAccessAccordion } from "@/components/dashboard/QuickAccessAccordion";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { ActionsPanel, type PanelAction } from "@/components/dashboard/ActionsPanel";
import { requireUser } from "@/lib/access";
import { dateOnlyStringUTC } from "@/lib/schedule";

export default async function ConsolePage() {
  const user = await requireUser();
  const userName = user.name ?? user.email ?? "there";

  const [auditRows, templateRows, customerRows, allActions] = await Promise.all([
    auditsRepo.list({ noResponses: true }),
    templatesRepo.list(),
    customersRepo.list(),
    actionsRepo.list(),
  ]);
  const templateCount = templateRows.length;
  const customerCount = customerRows.length;
  const recentTemplates = [...templateRows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 4).map((t) => ({ id: t.id, name: t.name }));
  const recentCustomers = [...customerRows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 4).map((c) => ({ id: c.id, name: c.name }));
  const templatesForCategories = templateRows;
  const openActionRows = allActions.filter((a) => a.status !== "RESOLVED");

  const todayKey = dateOnlyStringUTC(new Date());
  const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  const panelActions: PanelAction[] = openActionRows
    .map((a) => ({
      id: a.id,
      title: a.title,
      customerName: a.customerName,
      priority: a.priority,
      overdue: !!a.dueDate && a.dueDate < todayKey,
    }))
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

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

  const hero = computeHeroMetrics(audits);
  const week = computeWeekCounts(audits);
  const ring = computeScoreRing(audits);
  const fleet = computeFleetHealth(audits);
  const featured = pickFeatured(audits);

  const categoryCounts = new Map<string, number>();
  for (const t of templatesForCategories) {
    categoryCounts.set(t.category, (categoryCounts.get(t.category) ?? 0) + 1);
  }
  const categories = Array.from(categoryCounts.entries()).map(([name, count]) => ({ name, count }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Hero
        userName={userName}
        totalAudits={audits.length}
        flaggedCount={fleet.flagged}
        cleared={hero.cleared}
        marginal={hero.marginal}
        inProgress={hero.inProgress}
        flagged={hero.flagged}
        templateCount={templateCount}
        customerCount={customerCount}
      />

      <div className="ops-grid">
        <FeatureCard audit={featured} />
        <WeekChart data={week} total={audits.length} />
        <ScoreRing week={ring.week} allTime={ring.allTime} />
        <FleetHealth data={fleet} />
      </div>

      <ActionsPanel actions={panelActions.slice(0, 5)} openCount={panelActions.length} overdueCount={panelActions.filter((a) => a.overdue).length} />

      <div className="lower-grid">
        <QuickAccessAccordion recentTemplates={recentTemplates} recentCustomers={recentCustomers} categories={categories} />
        <DashboardCalendar audits={audits} />
      </div>
    </div>
  );
}
