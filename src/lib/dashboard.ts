export interface DashboardAudit {
  id: string;
  docNumber: string;
  title: string;
  customerName: string;
  customerId: string;
  date: Date;
  draft: boolean;
  pendingApproval: boolean;
  criticalFail: boolean;
  score: number | null;
}

// "Completed" here means scored and not awaiting approval — matches
// design-3.html's renderHero()/renderFleet() banding (90/70 thresholds).
function completedOf(audits: DashboardAudit[]) {
  return audits.filter((a) => !a.draft && !a.pendingApproval);
}

// A critical-fail audit is always "Flagged" regardless of its numeric score
// (matches auditStatus() in lib/scoring.ts, used elsewhere on the same
// dashboard) — without this, a critically-failed audit with a high average
// score would count as "Cleared" here while rendering red/"Flagged" via
// auditStatus() on the same page.
function isFlagged(a: DashboardAudit): boolean {
  return a.criticalFail || (a.score ?? 0) < 70;
}

export function computeHeroMetrics(audits: DashboardAudit[]) {
  const completed = completedOf(audits);
  const cleared = completed.filter((a) => !isFlagged(a) && (a.score ?? 0) >= 90).length;
  const marginal = completed.filter((a) => !isFlagged(a) && (a.score ?? 0) >= 70 && (a.score ?? 0) < 90).length;
  const flagged = completed.filter(isFlagged).length;
  const inProgress = audits.filter((a) => a.draft || a.pendingApproval).length;

  return { cleared, marginal, flagged, inProgress };
}

export function computeWeekCounts(audits: DashboardAudit[]): { label: string; count: number; isToday: boolean }[] {
  const days: { label: string; count: number; key: string; isToday: boolean }[] = [];
  const today = new Date();
  const todayKey = today.toDateString();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    days.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), count: 0, key, isToday: key === todayKey });
  }
  for (const a of audits) {
    const key = a.date.toDateString();
    const day = days.find((d) => d.key === key);
    if (day) day.count += 1;
  }
  return days.map(({ label, count, isToday }) => ({ label, count, isToday }));
}

function average(scores: number[]): number {
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
}

export function computeScoreRing(audits: DashboardAudit[]): { week: number; allTime: number } {
  const completed = completedOf(audits).filter((a) => a.score !== null);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const thisWeek = completed.filter((a) => a.date >= weekStart);
  return {
    week: average(thisWeek.map((a) => a.score ?? 0)),
    allTime: average(completed.map((a) => a.score ?? 0)),
  };
}

export interface FleetHealth {
  cleared: number;
  marginal: number;
  flagged: number;
  queue: DashboardAudit[];
  queueTotal: number;
}

export function computeFleetHealth(audits: DashboardAudit[]): FleetHealth {
  const completed = completedOf(audits);
  const cleared = completed.filter((a) => !isFlagged(a) && (a.score ?? 0) >= 90).length;
  const marginal = completed.filter((a) => !isFlagged(a) && (a.score ?? 0) >= 70 && (a.score ?? 0) < 90).length;
  const flagged = completed.filter(isFlagged).length;

  const needsFollowup = audits.filter(
    (a) => a.draft || a.pendingApproval || (!a.draft && (isFlagged(a) || (a.score ?? 0) < 90))
  );

  return { cleared, marginal, flagged, queue: needsFollowup, queueTotal: audits.length };
}

export function pickFeatured(audits: DashboardAudit[]): DashboardAudit | null {
  const completed = completedOf(audits);
  // Critical-fail audits sort as worst regardless of their numeric score,
  // so a high-scoring but critically-failed audit still surfaces here
  // instead of being masked by an unflagged low scorer.
  const sorted = completed.slice().sort((a, b) => {
    const aKey = a.criticalFail ? -1 : (a.score ?? 0);
    const bKey = b.criticalFail ? -1 : (b.score ?? 0);
    return aKey - bKey;
  });
  return sorted[0] ?? audits[0] ?? null;
}
