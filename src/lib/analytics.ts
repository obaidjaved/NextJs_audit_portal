import { auditStatus, type ResponseObject } from "./scoring";

export interface AnalyticsAudit {
  date: Date;
  score: number | null;
  draft: boolean;
  pendingApproval: boolean;
  criticalFail: boolean;
  customerName: string;
  templateName: string;
  responses: unknown;
}

export interface MonthPoint {
  key: string; // YYYY-MM
  label: string;
  count: number;
  avg: number | null;
}

export interface GroupStat {
  name: string;
  count: number;
  avg: number;
  flagged: number;
}

export interface FindingStat {
  label: string;
  fails: number;
  marginals: number;
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

function groupBy(audits: AnalyticsAudit[], pick: (a: AnalyticsAudit) => string): GroupStat[] {
  const map = new Map<string, AnalyticsAudit[]>();
  for (const a of audits) {
    const k = pick(a);
    map.set(k, [...(map.get(k) ?? []), a]);
  }
  return [...map.entries()]
    .map(([name, list]) => ({
      name,
      count: list.length,
      avg: avg(list.flatMap((a) => (a.score === null ? [] : [a.score]))) ?? 0,
      flagged: list.filter((a) => auditStatus(a) === "Flagged").length,
    }))
    .sort((a, b) => b.count - a.count);
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function computeAnalytics(all: AnalyticsAudit[], now = new Date()) {
  const finished = all.filter((a) => !a.draft && !a.pendingApproval);
  const scores = finished.flatMap((a) => (a.score === null ? [] : [a.score]));

  const statuses = { Cleared: 0, Marginal: 0, Flagged: 0 };
  for (const a of finished) {
    const s = auditStatus(a);
    if (s in statuses) statuses[s as keyof typeof statuses] += 1;
  }

  // Trailing 12 calendar months, oldest first.
  const months: MonthPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: d.toLocaleDateString(undefined, { month: "short" }), count: 0, avg: null });
  }
  const bucket = new Map<string, number[]>();
  for (const a of finished) {
    const k = monthKey(a.date);
    const m = months.find((x) => x.key === k);
    if (!m) continue;
    m.count += 1;
    if (a.score !== null) bucket.set(k, [...(bucket.get(k) ?? []), a.score]);
  }
  for (const m of months) m.avg = avg(bucket.get(m.key) ?? []);

  const findingMap = new Map<string, FindingStat>();
  for (const a of finished) {
    const list = Array.isArray(a.responses) ? (a.responses as ResponseObject[]) : [];
    for (const r of list) {
      const failed = (r.type === "status" && r.value === "fail") || (r.type === "choice" && !!r.option?.fail);
      const marginal = r.type === "status" && r.value === "marginal";
      if (!failed && !marginal) continue;
      const cur = findingMap.get(r.label) ?? { label: r.label, fails: 0, marginals: 0 };
      if (failed) cur.fails += 1;
      else cur.marginals += 1;
      findingMap.set(r.label, cur);
    }
  }
  const topFindings = [...findingMap.values()]
    .sort((a, b) => b.fails * 2 + b.marginals - (a.fails * 2 + a.marginals))
    .slice(0, 8);

  return {
    total: finished.length,
    avgScore: avg(scores),
    passRate: finished.length ? Math.round((statuses.Cleared / finished.length) * 100) : null,
    statuses,
    months,
    byCustomer: groupBy(finished, (a) => a.customerName).slice(0, 8),
    byTemplate: groupBy(finished, (a) => a.templateName).slice(0, 8),
    topFindings,
  };
}
