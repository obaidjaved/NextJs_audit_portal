"use client";

import { useMemo, useState } from "react";
import { updateLead } from "@/lib/actions/ops";
import { LEAD_STATUSES } from "@/lib/ops-options";
import { InlineSelect } from "@/components/ops/Inline";
import { CallEmail, ContactCell, PaymentPill, ServiceChips, fmtDate } from "@/components/ops/Parts";
import { LeadDetails } from "./LeadDetails";

export interface LeadRow {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  title: string | null;
  street: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  services: string[];
  dateNeeded: string; // YYYY-MM-DD — date of service required
  additionalInfo: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string; // ISO — date of lead
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  customerId: string | null;
  leadStatus: string;
  paymentStatus: string;
  budgetQuote: number | null;
  amountPaid: number;
  paymentProofs: string[];
}

// Header label + column width (% of the table). Only the important columns live
// here; everything else is in the Details popup.
const COLS: [string, string][] = [
  ["Lead", "31%"],
  ["Service", "23%"],
  ["Status", "19%"],
  ["Date of lead", "12%"],
  ["", "15%"],
];

export function LeadsTable({ leads, canReview }: { leads: LeadRow[]; canReview: boolean }) {
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter !== "All" && l.leadStatus !== filter) return false;
      if (!q) return true;
      return [l.firstName, l.lastName, l.companyName, l.email, l.phone, l.city, l.state, ...l.services].join(" ").toLowerCase().includes(q);
    });
  }, [leads, filter, search]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of leads) m.set(l.leadStatus, (m.get(l.leadStatus) ?? 0) + 1);
    return m;
  }, [leads]);

  const open = leads.find((l) => l.id === openId) ?? null;

  function cells(l: LeadRow) {
    const locked = l.status !== "PENDING";
    return {
      contact: <ContactCell name={`${l.firstName} ${l.lastName}`.trim()} title={l.title} company={l.companyName} email={l.email} phone={l.phone} />,
      service: (
        <div>
          <ServiceChips services={l.services} kind="type" />
          {l.services.length > 0 && (
            <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4 }}>
              {l.services.length} sub service{l.services.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
      ),
      status: (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
          <InlineSelect
            label="Lead status"
            value={l.leadStatus}
            options={LEAD_STATUSES.filter((s) => s !== "Converted" || l.leadStatus === "Converted")}
            disabled={locked}
            onSave={(v) => updateLead(l.id, { leadStatus: v })}
          />
          <PaymentPill status={l.paymentStatus} />
        </div>
      ),
      date: fmtDate(l.createdAt),
      actions: (
        <div className="dt-row-actions">
          <CallEmail compact email={l.email} phone={l.phone} />
          <button type="button" className="btn ghost sm" onClick={() => setOpenId(l.id)}>
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
          <input placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="filter-row" style={{ flexWrap: "wrap" }}>
          {["All", ...LEAD_STATUSES].map((s) => (
            <button key={s} type="button" className={filter === s ? "active" : ""} onClick={() => setFilter(s)}>
              {s}
              {s !== "All" && counts.get(s) ? ` (${counts.get(s)})` : s === "All" ? ` (${leads.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="card-soft" style={{ padding: 22, color: "var(--ink-2)", fontSize: 13.5 }}>
          {leads.length === 0
            ? "No leads yet. Quote-form submissions appear here, and you can add one yourself with “+ Add lead”."
            : "No leads match this filter."}
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
                {shown.map((l) => {
                  const c = cells(l);
                  return (
                    <tr key={l.id}>
                      <td>{c.contact}</td>
                      <td>{c.service}</td>
                      <td>{c.status}</td>
                      <td>{c.date}</td>
                      <td>{c.actions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="dt-cards">
            {shown.map((l) => {
              const c = cells(l);
              return (
                <div key={l.id} className="card dt-card">
                  {c.contact}
                  <div className="dt-card-grid">
                    <div className="dt-wide">
                      <div className="dt-field-label">Service</div>
                      {c.service}
                    </div>
                    <div>
                      <div className="dt-field-label">Status</div>
                      {c.status}
                    </div>
                    <div>
                      <div className="dt-field-label">Date of lead</div>
                      {c.date}
                    </div>
                  </div>
                  <div className="dt-row-actions">
                    <CallEmail compact email={l.email} phone={l.phone} />
                    <button type="button" className="btn ghost sm" style={{ flex: 1 }} onClick={() => setOpenId(l.id)}>
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {open && <LeadDetails lead={open} canReview={canReview} onClose={() => setOpenId(null)} />}
    </div>
  );
}
