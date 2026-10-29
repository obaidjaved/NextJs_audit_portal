"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
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
  ["Customer name", "22%"],
  ["Service needed by", "12%"],
  ["Service", "17%"],
  ["Auditor", "14%"],
  ["Status", "11%"],
  ["Report", "7%"],
  ["", "17%"],
];

export function AuditsTable({ audits, templates, initialQuery = "" }: { audits: AuditListRow[]; templates: EmailTemplateRow[]; initialQuery?: string }) {
  const [search, setSearch] = useState(initialQuery);
  const [status, setStatus] = useState("All");
  const [auditor, setAuditor] = useState("All");
  const [service, setService] = useState("All");
  const [emailId, setEmailId] = useState<string | null>(null);

  const auditorNames = useMemo(() => [...new Set(audits.map((a) => a.auditorName).filter((n): n is string => !!n))].sort(), [audits]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return audits.filter((a) => {
      if (status !== "All" && a.status !== status) return false;
      if (auditor !== "All" && a.auditorName !== auditor) return false;
      if (service !== "All" && !serviceTypesOf(a.services).includes(service)) return false;
      if (!q) return true;
      return [a.customerName, a.title, a.docNumber, a.auditorName, ...a.services].join(" ").toLowerCase().includes(q);
    });
  }, [audits, search, status, auditor, service]);

  const paged = usePaged(filtered, `${search}|${status}|${auditor}|${service}`);
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
        <a className="dt-icon-btn" href={`/api/audits/${a.id}/pdf?inline=1`} target="_blank" rel="noreferrer" title="Preview / download the report PDF" aria-label={`Open the report PDF for ${a.docNumber}`}>
          <FileText size={16} />
        </a>
      ) : (
        <span style={{ color: "var(--ink-3)", fontSize: 12 }}>—</span>
      ),
      actions: (
        <div className="dt-row-actions">
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
        }}
        filters={[
          { label: "Status", value: status, onChange: setStatus, options: ["All", ...STATUSES] },
          { label: "Auditor", value: auditor, onChange: setAuditor, options: ["All", ...auditorNames] },
          { label: "Service", value: service, onChange: setService, options: ["All", ...SERVICE_GROUPS.map((g) => g.group)] },
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
          onClose={() => setEmailId(null)}
        />
      )}
    </div>
  );
}
