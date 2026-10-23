"use client";

import { useMemo, useState } from "react";
import { updateCustomerOps } from "@/lib/actions/ops";
import { PROGRESS_STATUSES, money } from "@/lib/ops-options";
import { InlineSelect } from "@/components/ops/Inline";
import { CallEmail, ContactCell, PaymentPill, ServiceChips } from "@/components/ops/Parts";
import { CustomerDetails } from "./CustomerDetails";

export interface CustomerOpsRow {
  id: string;
  name: string; // company
  contact: string | null; // "First Last, Title"
  email: string | null;
  phone: string | null;
  site: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  services: string[];
  serviceDate: string | null;
  assignedAuditorId: string | null;
  assignedAuditorName: string | null;
  assignedAt: string | null; // ISO
  paymentStatus: string;
  projectValue: number | null;
  progressStatus: string;
  paymentProofs: string[];
  // The newest finished audit, shown as the "Final report".
  finalReportId: string | null;
  finalReportDoc: string | null;
}

// Header label + column width (% of the table). Only the important columns live
// here; everything else is in the Details popup.
const COLS: [string, string][] = [
  ["Customer", "29%"],
  ["Service", "21%"],
  ["Auditor", "14%"],
  ["Progress", "17%"],
  ["Value", "8%"],
  ["", "11%"],
];

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
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (progress !== "All" && c.progressStatus !== progress) return false;
      if (!q) return true;
      return [c.name, c.contact, c.email, c.phone, c.assignedAuditorName, ...c.services].join(" ").toLowerCase().includes(q);
    });
  }, [customers, search, progress]);

  const open = customers.find((c) => c.id === openId) ?? null;

  function cells(c: CustomerOpsRow) {
    const { name, title } = splitContact(c.contact);
    return {
      contact: <ContactCell name={name} title={title} company={c.name} email={c.email} phone={c.phone} />,
      service: (
        <div>
          <ServiceChips services={c.services} kind="type" />
          {c.services.length > 0 && (
            <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4 }}>
              {c.services.length} sub service{c.services.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      ),
      auditor: c.assignedAuditorName ? (
        <span style={{ fontWeight: 600 }}>{c.assignedAuditorName}</span>
      ) : (
        <span className="pill warn" style={{ textTransform: "none", letterSpacing: 0 }}>Unassigned</span>
      ),
      progress: (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
          <InlineSelect label="Progress status" value={c.progressStatus} options={PROGRESS_STATUSES} onSave={(v) => updateCustomerOps(c.id, { progressStatus: v })} />
          <PaymentPill status={c.paymentStatus} />
        </div>
      ),
      value: <span style={{ fontWeight: 600 }}>{money(c.projectValue)}</span>,
      actions: (
        <div className="dt-row-actions">
          <CallEmail compact email={c.email} phone={c.phone} />
          <button type="button" className="btn ghost sm" onClick={() => setOpenId(c.id)}>
            Details
          </button>
        </div>
      ),
    };
  }

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
          {customers.length === 0 ? "No customers yet. Add one with “+ New Customer”, or convert a lead." : "No customers match this filter."}
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
                {shown.map((cu) => {
                  const c = cells(cu);
                  return (
                    <tr key={cu.id}>
                      <td>{c.contact}</td>
                      <td>{c.service}</td>
                      <td>{c.auditor}</td>
                      <td>{c.progress}</td>
                      <td>{c.value}</td>
                      <td>{c.actions}</td>
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
                    <div className="dt-wide">
                      <div className="dt-field-label">Service</div>
                      {c.service}
                    </div>
                    <div>
                      <div className="dt-field-label">Auditor</div>
                      {c.auditor}
                    </div>
                    <div>
                      <div className="dt-field-label">Value</div>
                      {c.value}
                    </div>
                    <div className="dt-wide">
                      <div className="dt-field-label">Progress</div>
                      {c.progress}
                    </div>
                  </div>
                  <div className="dt-row-actions">
                    <CallEmail compact email={cu.email} phone={cu.phone} />
                    <button type="button" className="btn ghost sm" style={{ flex: 1 }} onClick={() => setOpenId(cu.id)}>
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {open && <CustomerDetails customer={open} auditors={auditors} canAssign={canAssign} onClose={() => setOpenId(null)} />}
    </div>
  );
}
