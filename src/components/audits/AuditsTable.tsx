"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { setAuditReview } from "@/lib/actions/audits";
import { updateCustomerOps } from "@/lib/actions/ops";
import type { ReviewStatus } from "@/lib/audit-review";
import { matchesView, type AuditRow, type AuditView } from "@/lib/audit-rows";
import { serviceTypesOf } from "@/lib/ops-options";
import { SERVICE_GROUPS } from "@/lib/quote-options";
import { AuditorCombobox } from "@/components/ops/AuditorCombobox";
import { InlineSelect } from "@/components/ops/Inline";
import { FilterBar, Pagination, usePaged } from "@/components/ops/ListControls";
import { fmtDate } from "@/components/ops/Parts";
import { EmailDialog, type EmailTemplateRow } from "./EmailDialog";

const VIEW_OPTIONS: { value: AuditView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unassigned", label: "Needs assigning" },
  { value: "upcoming", label: "Coming up" },
  { value: "completed", label: "Completed" },
];

const REVIEW_PILL: Record<ReviewStatus, string> = { Approved: "ok", "Needs Correction": "danger", "Pending approval": "warn", "In progress": "pending" };
const REVIEW_OPTIONS = ["Approved", "Needs Correction"];
const STATUS_FILTER: string[] = ["All", "Approved", "Needs Correction", "Pending approval", "In progress", "No audit yet"];

// Header label + column width (% of the table).
const COLS: [string, string][] = [
  ["Name", "26%"],
  ["Date of assignment", "11%"],
  ["Date of service given", "11%"],
  ["Name of auditor", "18%"],
  ["Status", "16%"],
  ["", "18%"],
];

export function AuditsTable({
  rows,
  templates,
  auditors,
  isAdmin,
  initialView = "all",
  initialQuery = "",
}: {
  rows: AuditRow[];
  templates: EmailTemplateRow[];
  auditors: { id: string; name: string }[];
  isAdmin: boolean;
  initialView?: AuditView;
  initialQuery?: string;
}) {
  const [search, setSearch] = useState(initialQuery);
  const [view, setView] = useState<string>(initialView);
  const [status, setStatus] = useState("All");
  const [auditor, setAuditor] = useState("All");
  const [service, setService] = useState("All");
  const [todayKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [emailKey, setEmailKey] = useState<string | null>(null);

  const auditorNames = useMemo(() => [...new Set(rows.map((r) => r.auditorName).filter((n): n is string => !!n))].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matchesView(r, view as AuditView, todayKey)) return false;
      if (status !== "All" && (r.review ?? "No audit yet") !== status) return false;
      if (auditor === "Not assigned" ? !!r.auditorId : auditor !== "All" && r.auditorName !== auditor) return false;
      if (service !== "All" && !serviceTypesOf(r.services).includes(service)) return false;
      if (!q) return true;
      return [r.company, r.client, r.code, r.address, r.auditorName, ...r.services].join(" ").toLowerCase().includes(q);
    });
  }, [rows, search, view, status, auditor, service, todayKey]);

  const paged = usePaged(filtered, `${search}|${view}|${status}|${auditor}|${service}`);
  const emailing = rows.find((r) => r.key === emailKey) ?? null;
  const reportTemplate = templates.find((t) => t.attachReport && /report/i.test(t.name)) ?? templates.find((t) => t.attachReport);

  function cells(r: AuditRow) {
    const nameInner = (
      <>
        <span className="dt-contact-name">{r.company}</span>
        <span className="dt-contact-co">{r.client || "—"}</span>
        <span className="dt-contact-line mono">{r.code ?? "No audit yet"}</span>
        {r.address && <span className="dt-contact-line">{r.address}</span>}
      </>
    );
    return {
      name: r.auditId ? (
        <Link href={`/audits/${r.auditId}`} className="dt-contact" style={{ textDecoration: "none", color: "inherit" }}>
          {nameInner}
        </Link>
      ) : (
        <div className="dt-contact">{nameInner}</div>
      ),
      assigned: fmtDate(r.assignedAt),
      done: fmtDate(r.doneAt),
      // Auditors are assigned here (not on the Customers tab); it applies to the customer's whole query.
      auditor: isAdmin ? (
        <AuditorCombobox value={r.auditorId} auditors={auditors} onSave={(id) => updateCustomerOps(r.customerId, { assignedAuditorId: id })} />
      ) : (
        <span style={{ fontWeight: 600 }}>{r.auditorName ?? "Not assigned yet"}</span>
      ),
      status: !r.review ? (
        <span className="pill pending" style={{ textTransform: "none", letterSpacing: 0 }}>No audit yet</span>
      ) : isAdmin ? (
        <InlineSelect label="Review status" value={r.review} options={REVIEW_OPTIONS} onSave={(v) => setAuditReview(r.auditId as string, v as "Approved" | "Needs Correction")} />
      ) : (
        <span className={`pill ${REVIEW_PILL[r.review]}`} style={{ textTransform: "none", letterSpacing: 0 }}>{r.review}</span>
      ),
      actions: (
        <div className="dt-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <button
            type="button"
            className="btn primary sm"
            disabled={!r.approved}
            title={r.approved ? "Email the report to the customer" : r.auditId ? "Approve the audit before sending its report" : "There is no audit yet"}
            onClick={() => setEmailKey(r.key)}
          >
            Send Report
          </button>
          {r.submitted ? (
            <a className="btn ghost sm" href={`/api/audits/${r.auditId}/pdf?inline=1`} target="_blank" rel="noreferrer">
              View Report
            </a>
          ) : (
            <span className="btn ghost sm" aria-disabled="true" style={{ opacity: 0.45, cursor: "not-allowed" }} title="No submitted report yet">
              View Report
            </span>
          )}
        </div>
      ),
    };
  }

  return (
    <div>
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search by company, client, code, address…"
        onClear={() => {
          setSearch("");
          setView("all");
          setStatus("All");
          setAuditor("All");
          setService("All");
        }}
        filters={[
          { label: "Show", value: view, onChange: setView, options: VIEW_OPTIONS },
          { label: "Status", value: status, onChange: setStatus, options: STATUS_FILTER },
          { label: "Auditor", value: auditor, onChange: setAuditor, options: ["All", "Not assigned", ...auditorNames] },
          { label: "Service", value: service, onChange: setService, options: ["All", ...SERVICE_GROUPS.map((g) => g.group)] },
        ]}
      />

      {filtered.length === 0 ? (
        <div className="card-soft" style={{ padding: 22, color: "var(--ink-2)", fontSize: 13.5 }}>
          {rows.length === 0 ? "No audits yet." : "Nothing matches these filters."}
        </div>
      ) : (
        <>
          <div className="dt-wrap">
            <table className="dt">
              <colgroup>
                {COLS.map(([, w], i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {COLS.map(([h], i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.pageItems.map((r) => {
                  const c = cells(r);
                  return (
                    <tr key={r.key}>
                      <td>{c.name}</td>
                      <td>{c.assigned}</td>
                      <td>{c.done}</td>
                      <td>{c.auditor}</td>
                      <td>{c.status}</td>
                      <td>{c.actions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="dt-cards">
            {paged.pageItems.map((r) => {
              const c = cells(r);
              return (
                <div key={r.key} className="card dt-card">
                  {c.name}
                  <div className="dt-card-grid">
                    <div>
                      <div className="dt-field-label">Assigned on</div>
                      {c.assigned}
                    </div>
                    <div>
                      <div className="dt-field-label">Service given</div>
                      {c.done}
                    </div>
                    <div className="dt-wide">
                      <div className="dt-field-label">Auditor</div>
                      {c.auditor}
                    </div>
                    <div className="dt-wide">
                      <div className="dt-field-label">Status</div>
                      {c.status}
                    </div>
                  </div>
                  {c.actions}
                </div>
              );
            })}
          </div>

          <Pagination {...paged} onPage={paged.setPage} />
        </>
      )}

      {emailing && emailing.auditId && (
        <EmailDialog
          auditId={emailing.auditId}
          title={`${emailing.company}${emailing.code ? ` — ${emailing.code}` : ""}`}
          to={emailing.email ?? ""}
          values={emailing.merge}
          completed={emailing.approved}
          templates={templates}
          defaultTemplateId={reportTemplate?.id}
          canManage={isAdmin}
          onClose={() => setEmailKey(null)}
        />
      )}
    </div>
  );
}
