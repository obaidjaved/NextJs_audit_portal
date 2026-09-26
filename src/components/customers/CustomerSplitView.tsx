"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarGrid, type CalendarEvent } from "@/components/calendar/CalendarGrid";
import { auditStatus } from "@/lib/scoring";
import { initials } from "@/lib/initials";
import { FREQUENCY_LABEL, type ScheduleFrequency } from "@/lib/schedule";

export interface CustomerRow {
  id: string;
  name: string;
  site: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
}

export interface AuditRow {
  id: string;
  docNumber: string;
  customerId: string;
  title: string;
  date: string; // ISO
  draft: boolean;
  pendingApproval: boolean;
  criticalFail: boolean;
  score: number | null;
}

export interface ActionSummary {
  id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  dueDate: string | null; // YYYY-MM-DD
  customerId: string;
  auditDoc: string | null;
}

export interface ScheduleSummary {
  id: string;
  title: string;
  frequency: ScheduleFrequency;
  active: boolean;
  customerId: string;
  templateName: string;
}

const STATUS_PILL: Record<string, string> = {
  "In Progress": "pending",
  "Pending Approval": "pending",
  Flagged: "danger",
  Cleared: "ok",
  Marginal: "warn",
};

const PRIORITY_PILL = { CRITICAL: "danger", HIGH: "danger", MEDIUM: "warn", LOW: "pending" } as const;

const STATUS_COLOR: Record<string, string> = {
  "In Progress": "--pending",
  "Pending Approval": "--pending",
  Flagged: "--danger",
  Cleared: "--ok",
  Marginal: "--warn",
};

export function CustomerSplitView({
  customers,
  audits,
  actions,
  schedules,
}: {
  customers: CustomerRow[];
  audits: AuditRow[];
  actions: ActionSummary[];
  schedules: ScheduleSummary[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("customerId") ?? customers[0]?.id ?? null;
  const [search, setSearch] = useState("");
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  const filtered = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase())),
    [customers, search],
  );

  const selected = customers.find((c) => c.id === selectedId) ?? null;
  const customerAudits = useMemo(
    () => audits.filter((a) => a.customerId === selectedId).sort((a, b) => b.date.localeCompare(a.date)),
    [audits, selectedId],
  );

  const stats = useMemo(() => {
    const total = customerAudits.length;
    const cleared = customerAudits.filter((a) => !a.draft && auditStatus(a) === "Cleared").length;
    const flagged = customerAudits.filter((a) => !a.draft && auditStatus(a) === "Flagged").length;
    const lastVisit = customerAudits[0]?.date ?? null;
    const scored = customerAudits.filter((a) => !a.draft && !a.pendingApproval && a.score !== null);
    const avgScore = scored.length ? Math.round(scored.reduce((sum, a) => sum + (a.score ?? 0), 0) / scored.length) : null;
    return { total, cleared, flagged, lastVisit, avgScore };
  }, [customerAudits]);

  const customerActions = useMemo(() => actions.filter((a) => a.customerId === selectedId), [actions, selectedId]);
  const openActions = customerActions.filter((a) => a.status !== "RESOLVED");
  const customerSchedules = useMemo(() => schedules.filter((x) => x.customerId === selectedId), [schedules, selectedId]);

  const events: CalendarEvent[] = customerAudits.map((a) => {
    const status = auditStatus(a);
    return {
      date: new Date(a.date),
      label: a.title,
      colorToken: STATUS_COLOR[status] ?? "--ink-2",
      initial: initials(a.title),
    };
  });

  function select(id: string) {
    router.push(`/customers?customerId=${id}`);
  }

  return (
    <div className="cust-shell">
      <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Link href="/customers/new" className="btn ghost sm">
          + New Customer
        </Link>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 520, overflowY: "auto" }}>
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.id)}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
                background: c.id === selectedId ? "var(--pill)" : "transparent",
                color: c.id === selectedId ? "var(--pill-ink)" : "var(--ink)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</div>
              {c.site && (
                <div style={{ fontSize: 11.5, opacity: 0.7 }}>{c.site}</div>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--ink-2)", padding: "10px 12px" }}>No customers found.</p>
          )}
        </div>
      </div>

      {selected ? (
        <>
          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>{selected.name}</h2>
              {selected.site && <p style={{ fontSize: 13, color: "var(--ink-2)" }}>{selected.site}</p>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
              <StatCard label="Total Audits" value={stats.total} />
              <StatCard label="Avg Score" value={stats.avgScore === null ? "—" : `${stats.avgScore}%`} />
              <StatCard label="Cleared" value={stats.cleared} />
              <StatCard label="Flagged" value={stats.flagged} />
              <StatCard label="Open Actions" value={openActions.length} />
              <StatCard label="Last Visit" value={stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"} />
            </div>

            <CalendarGrid year={calYear} month={calMonth} events={events} onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }} />
          </div>

          <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                Info
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5 }}>
                {(selected.city || selected.state || selected.zip) && (
                  <span>{[selected.city, [selected.state, selected.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</span>
                )}
                {selected.contact && <span style={{ color: "var(--ink-2)" }}>{selected.contact}</span>}
                {selected.email && <a href={`mailto:${selected.email}`} style={{ textDecoration: "underline" }}>{selected.email}</a>}
                {selected.phone && <a href={`tel:${selected.phone}`} style={{ textDecoration: "underline" }}>{selected.phone}</a>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <Link href={`/customers/${selected.id}/edit`} className="btn ghost sm">Edit Customer</Link>
                <Link href={`/new-audit?customerId=${selected.id}`} className="btn primary sm">+ New Audit</Link>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                Audit History
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {customerAudits.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-2)" }}>No audits yet.</p>}
                {customerAudits.map((a) => (
                  <Link
                    key={a.id}
                    href={`/audits/${a.id}`}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 0", borderBottom: "1px solid var(--rule)" }}
                  >
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.title}
                      <span style={{ color: "var(--ink-3)" }}> · {new Date(a.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </span>
                    <span className="mono" style={{ color: "var(--ink-2)", flex: "none" }}>{a.docNumber}</span>
                    <span className={`pill ${STATUS_PILL[auditStatus(a)]}`}>{a.score !== null && !a.draft ? a.score : auditStatus(a)}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                Corrective Actions ({customerActions.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {customerActions.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-2)" }}>None raised.</p>}
                {customerActions.slice(0, 8).map((a) => (
                  <Link key={a.id} href="/actions" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 0", borderBottom: "1px solid var(--rule)" }}>
                    <span className={`pill ${PRIORITY_PILL[a.priority]}`}>{a.priority}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: a.status === "RESOLVED" ? "line-through" : "none" }}>{a.title}</span>
                    <span className={`pill ${a.status === "RESOLVED" ? "ok" : a.status === "IN_PROGRESS" ? "pending" : "warn"}`}>{a.status === "IN_PROGRESS" ? "In progress" : a.status[0] + a.status.slice(1).toLowerCase()}</span>
                  </Link>
                ))}
                {customerActions.length > 8 && (
                  <Link href={`/actions?tab=all&customerId=${selectedId}`} style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-ink)", paddingTop: 8 }}>
                    View all {customerActions.length} →
                  </Link>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
                Schedules ({customerSchedules.length})
              </div>
              {customerSchedules.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-2)" }}>No recurring inspections.</p>}
              {customerSchedules.map((x) => (
                <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 0", borderBottom: "1px solid var(--rule)" }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {x.title}
                    <span style={{ color: "var(--ink-3)" }}> · {x.templateName}</span>
                  </span>
                  <span className={`pill ${x.active ? "ok" : "warn"}`}>{FREQUENCY_LABEL[x.frequency]}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ padding: 24, color: "var(--ink-2)" }}>No customers yet — create one to get started.</div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card-soft" style={{ padding: 14 }}>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{label}</div>
    </div>
  );
}
