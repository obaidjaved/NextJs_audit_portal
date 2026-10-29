"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import type { AuditStatus } from "@/lib/scoring";
import type { MergeValues } from "@/lib/email-merge";
import { serviceTypesOf } from "@/lib/ops-options";
import { SERVICE_GROUPS } from "@/lib/quote-options";
import { FilterBar, Pagination, usePaged } from "@/components/ops/ListControls";
import { CallEmail, ServiceChips, fmtDate } from "@/components/ops/Parts";
import { AuditRowMenu } from "./AuditRowMenu";
import { EmailDialog, type EmailTemplateRow } from "./EmailDialog";

export interface AuditListRow {
  id: string;
  docNumber: string;
  title: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  services: string[];
  serviceDate: string | null; // service needed by
  auditorName: string | null;
  date: string; // ISO — when the audit was done
  status: AuditStatus;
  completed: boolean; // finished and approved: has a report PDF
  merge: MergeValues;
}

const STATUS_PILL: Record<AuditStatus, string> = {
  "In Progress": "pending",
  "Pending Approval": "pending",
  Flagged: "danger",
  Cleared: "ok",
  Marginal: "warn",
};
const STATUSES: AuditStatus[] = ["In Progress", "Pending Approval", "Flagged", "Marginal", "Cleared"];

// Header label + column width (% of the table).
const COLS: [string, string][] = [
  ["Customer name", "18%"],
  ["Service needed by", "11%"],
  ["Service", "13%"],
  ["Auditor", "11%"],
  ["Status", "11%"],
  ["Report PDF", "11%"],
  ["", "25%"],
];

export function AuditsTable({
  audits,
  templates,
  canManageTemplates = false,
  initialQuery = "",
}: {
  audits: AuditListRow[];
  templates: EmailTemplateRow[];
  canManageTemplates?: boolean;
  initialQuery?: string;
}) {
  const [search, setSearch] = useState(initialQuery);
  const [status, setStatus] = useState("All");
  const [auditor, setAuditor] = useState("All");
  const [service, setService] = useState("All");
  const [when, setWhen] = useState("all");
  const [now] = useState(() => Date.now());
  const [emailId, setEmailId] = useState<string | null>(null);

  const auditorNames = useMemo(() => [...new Set(audits.map((a) => a.auditorName).filter((n): n is string => !!n))].sort(), [audits]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return audits.filter((a) => {
      if (status !== "All" && a.status !== status) return false;
      if (auditor !== "All" && a.auditorName !== auditor) return false;
      if (service !== "All" && !serviceTypesOf(a.services).includes(service)) return false;
      if (when !== "all" && new Date(a.date).getTime() < now - Number(when) * 86_400_000) return false;
      if (!q) return true;
      return [a.customerName, a.title, a.docNumber, a.auditorName, ...a.services].join(" ").toLowerCase().includes(q);
    });
  }, [audits, search, status, auditor, service, when, now]);

  const paged = usePaged(filtered, `${search}|${status}|${auditor}|${service}|${when}`);
  const emailing = audits.find((a) => a.id === emailId) ?? null;

  function cells(a: AuditListRow) {
    return {
      customer: (
        <Link href={`/audits/${a.id}`} className="dt-contact" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="dt-contact-name">{a.customerName}</span>
          <span className="dt-contact-co">{a.title}</span>
          <span className="dt-contact-line mono">{a.docNumber}</span>
        </Link>
      ),
      needed: fmtDate(a.serviceDate),
      service: a.services.length ? <ServiceChips services={a.services} kind="type" /> : <span style={{ color: "var(--ink-3)" }}>—</span>,
      auditor: a.auditorName ?? <span style={{ color: "var(--ink-3)" }}>—</span>,
      status: <span className={`pill ${STATUS_PILL[a.status]}`}>{a.status}</span>,
      report: a.completed ? (
        <div className="dt-row-actions" style={{ flexWrap: "nowrap" }}>
          <a className="dt-icon-btn" href={`/api/audits/${a.id}/pdf?inline=1`} target="_blank" rel="noreferrer" title="Preview the report PDF" aria-label={`Preview the report PDF for ${a.docNumber}`}>
            <FileText size={16} />
          </a>
          <a className="dt-icon-btn" href={`/api/audits/${a.id}/pdf`} title="Download the report PDF" aria-label={`Download the report PDF for ${a.docNumber}`}>
            <Download size={16} />
          </a>
        </div>
      ) : (
        <span style={{ color: "var(--ink-3)", fontSize: 12 }}>—</span>
      ),
      actions: (
        <div className="dt-row-actions" style={{ flexWrap: "nowrap" }}>
          <CallEmail compact phone={a.phone} onEmail={() => setEmailId(a.id)} />
          <Link href={`/audits/${a.id}`} className="btn ghost sm">Details</Link>
          <AuditRowMenu auditId={a.id} />
        </div>
      ),
    };
  }

  return (
    <div>
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search audits, customers, doc #…"
        onClear={() => {
          setSearch("");
          setStatus("All");
          setAuditor("All");
          setService("All");
          setWhen("all");
        }}
        filters={[
          { label: "Status", value: status, onChange: setStatus, options: ["All", ...STATUSES] },
          { label: "Auditor", value: auditor, onChange: setAuditor, options: ["All", ...auditorNames] },
          { label: "Service", value: service, onChange: setService, options: ["All", ...SERVICE_GROUPS.map((g) => g.group)] },
          {
            label: "Audit date",
            value: when,
            onChange: setWhen,
            options: [
              { value: "all", label: "Any time" },
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
            ],
          },
        ]}
      />

      {filtered.length === 0 ? (
        <div className="card-soft" style={{ padding: 22, color: "var(--ink-2)", fontSize: 13.5 }}>
          {audits.length === 0 ? "No audits yet." : "No audits match these filters."}
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
                {paged.pageItems.map((a) => {
                  const c = cells(a);
                  return (
                    <tr key={a.id}>
                      <td>{c.customer}</td>
                      <td>{c.needed}</td>
                      <td>{c.service}</td>
                      <td>{c.auditor}</td>
                      <td>{c.status}</td>
                      <td>{c.report}</td>
                      <td>{c.actions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="dt-cards">
            {paged.pageItems.map((a) => {
              const c = cells(a);
              return (
                <div key={a.id} className="card dt-card">
                  {c.customer}
                  <div className="dt-card-grid">
                    <div className="dt-wide">
                      <div className="dt-field-label">Service</div>
                      {c.service}
                    </div>
                    <div>
                      <div className="dt-field-label">Needed by</div>
                      {c.needed}
                    </div>
                    <div>
                      <div className="dt-field-label">Auditor</div>
                      {c.auditor}
                    </div>
                    <div>
                      <div className="dt-field-label">Status</div>
                      {c.status}
                    </div>
                    <div>
                      <div className="dt-field-label">Report</div>
                      {c.report}
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

      {emailing && (
        <EmailDialog
          auditId={emailing.id}
          title={`${emailing.customerName} — ${emailing.docNumber}`}
          to={emailing.email ?? ""}
          values={emailing.merge}
          completed={emailing.completed}
          templates={templates}
          canManage={canManageTemplates}
          onClose={() => setEmailId(null)}
        />
      )}
    </div>
  );
}
