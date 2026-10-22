"use client";

import { Fragment, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { approveQuoteRequest, rejectQuoteRequest } from "@/lib/actions/quote-requests";
import { updateLead } from "@/lib/actions/ops";
import { LEAD_STATUSES, PAYMENT_STATUSES, money } from "@/lib/ops-options";
import { InlineDate, InlineMoney, InlineSelect } from "@/components/ops/Inline";
import { CallEmail, ContactCell, fmtDate } from "@/components/ops/Parts";
import { ServicePicker } from "@/components/ops/ServicePicker";

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
}

const TH = ["Lead", "Date of lead", "Location", "Service type", "Sub service", "Service required by", "Payment status", "Budget quote", "Record payment", "Lead status", "Contact", ""];

function LeadDetails({ l, canReview }: { l: LeadRow; canReview: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function approve() {
    if (!confirm(`Approve ${l.companyName} and add it to your customers?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await approveQuoteRequest(l.id);
        router.push(res?.customerId ? `/customers?customerId=${res.customerId}` : "/customers");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to approve.");
      }
    });
  }

  function reject() {
    const note = prompt(`Reject ${l.companyName}? Optionally add a note for your records:`);
    if (note === null) return;
    setError(null);
    startTransition(async () => {
      try {
        await rejectQuoteRequest(l.id, note);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reject.");
      }
    });
  }

  const address = [l.street, l.street2, [l.city, l.state].filter(Boolean).join(", "), l.zip].filter(Boolean).join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, opacity: pending ? 0.6 : 1 }}>
      <div>
        <div className="dt-field-label">Address</div>
        {address || "—"}
      </div>
      {l.additionalInfo && (
        <div>
          <div className="dt-field-label">Additional info</div>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{l.additionalInfo}</p>
        </div>
      )}
      {l.status !== "PENDING" && (
        <p style={{ color: "var(--ink-2)" }}>
          {l.status === "APPROVED" ? "Approved" : "Rejected"}
          {l.reviewedBy && ` by ${l.reviewedBy}`}
          {l.reviewedAt && ` on ${fmtDate(l.reviewedAt)}`}
          {l.reviewNote && ` — “${l.reviewNote}”`}
          {l.status === "APPROVED" && l.customerId && (
            <>
              {" · "}
              <Link href={`/customers?customerId=${l.customerId}`} style={{ textDecoration: "underline", fontWeight: 700 }}>Open customer</Link>
            </>
          )}
        </p>
      )}
      {l.status === "PENDING" &&
        (canReview ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn primary sm" disabled={pending} onClick={approve}>
              {pending ? "Working…" : "Approve & add customer"}
            </button>
            <button type="button" className="btn ghost sm" disabled={pending} onClick={reject}>Reject</button>
          </div>
        ) : (
          <p style={{ color: "var(--ink-2)" }}>Only an administrator can approve or reject leads.</p>
        ))}
      {error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}

export function LeadsTable({ leads, canReview }: { leads: LeadRow[]; canReview: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

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

  // "Converted" is only reachable by approving a pending lead; everything else is a plain edit.
  async function saveStatus(l: LeadRow, value: string) {
    if (value === "Converted") {
      if (!confirm(`Approve ${l.companyName} and add it to your customers?`)) return;
      const res = await approveQuoteRequest(l.id);
      router.push(res?.customerId ? `/customers?customerId=${res.customerId}` : "/customers");
      return;
    }
    await updateLead(l.id, { leadStatus: value });
  }

  function cells(l: LeadRow) {
    const locked = l.status !== "PENDING";
    const statusOptions = l.status === "PENDING" && canReview ? LEAD_STATUSES : LEAD_STATUSES.filter((s) => s !== "Converted");
    const balance = l.budgetQuote !== null ? Math.max(l.budgetQuote - l.amountPaid, 0) : null;
    return {
      contact: <ContactCell name={`${l.firstName} ${l.lastName}`.trim()} title={l.title} company={l.companyName} email={l.email} phone={l.phone} />,
      date: fmtDate(l.createdAt),
      location: [l.city, l.state].filter(Boolean).join(", ") || "—",
      type: <ServicePicker label="Service type" kind="type" services={l.services} requireOne onSave={(s) => updateLead(l.id, { services: s })} />,
      sub: <ServicePicker label="Sub service" kind="sub" services={l.services} requireOne onSave={(s) => updateLead(l.id, { services: s })} />,
      required: <InlineDate label="Date of service required" value={l.dateNeeded} onSave={(v) => updateLead(l.id, { dateNeeded: v ?? l.dateNeeded })} />,
      payment: <InlineSelect label="Payment status" value={l.paymentStatus} options={PAYMENT_STATUSES} onSave={(v) => updateLead(l.id, { paymentStatus: v })} />,
      quote: <InlineMoney label="Budget quote" value={l.budgetQuote} onSave={(v) => updateLead(l.id, { budgetQuote: v })} />,
      paid: (
        <div>
          <InlineMoney label="Amount paid" value={l.amountPaid} nullable={false} onSave={(v) => updateLead(l.id, { amountPaid: v ?? 0 })} />
          {balance !== null && <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4 }}>Balance {money(balance)}</div>}
        </div>
      ),
      status: <InlineSelect label="Lead status" value={l.leadStatus} options={statusOptions} disabled={locked} onSave={(v) => saveStatus(l, v)} />,
      call: <CallEmail email={l.email} phone={l.phone} />,
      toggle: (
        <button type="button" className="btn ghost sm" aria-expanded={open === l.id} onClick={() => setOpen(open === l.id ? null : l.id)}>
          {open === l.id ? "Hide" : l.status === "PENDING" ? "Review" : "Details"}
        </button>
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
              <thead>
                <tr>
                  {TH.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => {
                  const c = cells(l);
                  return (
                    <Fragment key={l.id}>
                      <tr>
                        <td>{c.contact}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{c.date}</td>
                        <td>{c.location}</td>
                        <td>{c.type}</td>
                        <td>{c.sub}</td>
                        <td>{c.required}</td>
                        <td>{c.payment}</td>
                        <td>{c.quote}</td>
                        <td>{c.paid}</td>
                        <td>{c.status}</td>
                        <td>{c.call}</td>
                        <td>{c.toggle}</td>
                      </tr>
                      {open === l.id && (
                        <tr className="dt-detail">
                          <td colSpan={TH.length}>
                            <LeadDetails l={l} canReview={canReview} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
                    <Field label="Date of lead">{c.date}</Field>
                    <Field label="Location">{c.location}</Field>
                    <Field label="Service type" wide>{c.type}</Field>
                    <Field label="Sub service" wide>{c.sub}</Field>
                    <Field label="Service required by">{c.required}</Field>
                    <Field label="Lead status">{c.status}</Field>
                    <Field label="Payment status">{c.payment}</Field>
                    <Field label="Budget quote">{c.quote}</Field>
                    <Field label="Record payment" wide>{c.paid}</Field>
                  </div>
                  {c.call}
                  {c.toggle}
                  {open === l.id && (
                    <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
                      <LeadDetails l={l} canReview={canReview} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
