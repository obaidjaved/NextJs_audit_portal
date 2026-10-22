"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { updateCustomerOps } from "@/lib/actions/ops";
import { PAYMENT_STATUSES, PROGRESS_STATUSES } from "@/lib/ops-options";
import { InlineDate, InlineMoney, InlineSelect } from "@/components/ops/Inline";
import { CallEmail, ContactCell, fmtDate } from "@/components/ops/Parts";
import { ServicePicker } from "@/components/ops/ServicePicker";

export interface CustomerOpsRow {
  id: string;
  name: string; // company
  contact: string | null; // "First Last, Title"
  email: string | null;
  phone: string | null;
  services: string[];
  serviceDate: string | null;
  assignedAuditorId: string | null;
  assignedAuditorName: string | null;
  assignedAt: string | null; // ISO
  paymentStatus: string;
  projectValue: number | null;
  progressStatus: string;
  // The newest finished audit, shown as the "Final report".
  finalReportId: string | null;
  finalReportDoc: string | null;
}

const TH = ["Customer", "Service type", "Sub service", "Service required by", "Assigned auditor", "Date assigned", "Payment status", "Project value", "Final report", "Progress", "Contact", ""];

// "First Last, Title" -> name + title
function splitContact(contact: string | null): { name: string; title: string | null } {
  if (!contact) return { name: "", title: null };
  const i = contact.indexOf(",");
  return i === -1 ? { name: contact.trim(), title: null } : { name: contact.slice(0, i).trim(), title: contact.slice(i + 1).trim() || null };
}

export function CustomersTable({
  customers,
  auditors,
  canAssign,
}: {
  customers: CustomerOpsRow[];
  auditors: { id: string; name: string }[];
  canAssign: boolean;
}) {
  const [search, setSearch] = useState("");
  const [progress, setProgress] = useState("All");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (progress !== "All" && c.progressStatus !== progress) return false;
      if (!q) return true;
      return [c.name, c.contact, c.email, c.phone, c.assignedAuditorName, ...c.services].join(" ").toLowerCase().includes(q);
    });
  }, [customers, search, progress]);

  function cells(c: CustomerOpsRow) {
    const { name, title } = splitContact(c.contact);
    const auditorOptions = [{ value: "", label: "Unassigned" }, ...auditors.map((a) => ({ value: a.id, label: a.name }))];
    return {
      contact: <ContactCell name={name} title={title} company={c.name} email={c.email} phone={c.phone} />,
      type: <ServicePicker label="Service type" kind="type" services={c.services} onSave={(s) => updateCustomerOps(c.id, { services: s })} />,
      sub: <ServicePicker label="Sub service" kind="sub" services={c.services} onSave={(s) => updateCustomerOps(c.id, { services: s })} />,
      required: <InlineDate label="Date of service required" value={c.serviceDate} onSave={(v) => updateCustomerOps(c.id, { serviceDate: v })} />,
      auditor: canAssign ? (
        <InlineSelect label="Assigned auditor" value={c.assignedAuditorId ?? ""} options={auditorOptions} onSave={(v) => updateCustomerOps(c.id, { assignedAuditorId: v || null })} />
      ) : (
        <span>{c.assignedAuditorName ?? "Unassigned"}</span>
      ),
      assigned: c.assignedAuditorId ? fmtDate(c.assignedAt) : "—",
      payment: <InlineSelect label="Payment status" value={c.paymentStatus} options={PAYMENT_STATUSES} onSave={(v) => updateCustomerOps(c.id, { paymentStatus: v })} />,
      value: <InlineMoney label="Project value" value={c.projectValue} onSave={(v) => updateCustomerOps(c.id, { projectValue: v })} />,
      report: c.finalReportId ? (
        <Link href={`/audits/${c.finalReportId}`} className="btn ghost sm" style={{ height: 34 }}>
          View report
        </Link>
      ) : (
        <span style={{ color: "var(--ink-3)" }}>Not ready</span>
      ),
      progress: <InlineSelect label="Progress status" value={c.progressStatus} options={PROGRESS_STATUSES} onSave={(v) => updateCustomerOps(c.id, { progressStatus: v })} />,
      call: <CallEmail email={c.email} phone={c.phone} />,
      open: (
        <Link href={`/customers?customerId=${c.id}`} className="btn ghost sm">
          Open
        </Link>
      ),
    };
  }

  const Field = ({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) => (
    <div className={wide ? "dt-wide" : undefined}>
      <div className="dt-field-label">{label}</div>
      <div>{children}</div>
    </div>
  );

  return (
    <div>
      <div className="dt-toolbar">
        <div className="search-box" style={{ flex: "1 1 240px", maxWidth: 360 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-row" style={{ flexWrap: "wrap" }}>
          {["All", ...PROGRESS_STATUSES].map((s) => (
            <button key={s} type="button" className={progress === s ? "active" : ""} onClick={() => setProgress(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="card-soft" style={{ padding: 22, color: "var(--ink-2)", fontSize: 13.5 }}>
          {customers.length === 0 ? "No customers yet. Add one with “+ New Customer”, or approve a lead." : "No customers match this filter."}
        </div>
      ) : (
        <>
          <div className="dt-wrap">
            <table className="dt">
              <thead>
                <tr>
                  {TH.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((cu) => {
                  const c = cells(cu);
                  return (
                    <tr key={cu.id}>
                      <td>{c.contact}</td>
                      <td>{c.type}</td>
                      <td>{c.sub}</td>
                      <td>{c.required}</td>
                      <td>{c.auditor}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{c.assigned}</td>
                      <td>{c.payment}</td>
                      <td>{c.value}</td>
                      <td>{c.report}</td>
                      <td>{c.progress}</td>
                      <td>{c.call}</td>
                      <td>{c.open}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="dt-cards">
            {shown.map((cu) => {
              const c = cells(cu);
              return (
                <div key={cu.id} className="card dt-card">
                  {c.contact}
                  <div className="dt-card-grid">
                    <Field label="Service type" wide>{c.type}</Field>
                    <Field label="Sub service" wide>{c.sub}</Field>
                    <Field label="Service required by">{c.required}</Field>
                    <Field label="Progress">{c.progress}</Field>
                    <Field label="Assigned auditor">{c.auditor}</Field>
                    <Field label="Date assigned">{c.assigned}</Field>
                    <Field label="Payment status">{c.payment}</Field>
                    <Field label="Project value">{c.value}</Field>
                    <Field label="Final report" wide>{c.report}</Field>
                  </div>
                  {c.call}
                  {c.open}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
