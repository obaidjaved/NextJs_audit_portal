"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { convertLead, updateLead } from "@/lib/actions/ops";
import { unwrap } from "@/lib/actions/result";
import { LEAD_STATUSES, serviceTypesOf } from "@/lib/ops-options";
import { SERVICE_GROUPS } from "@/lib/quote-options";
import type { PaymentRecord } from "@/lib/repo-types";
import { InlineSelect } from "@/components/ops/Inline";
import { FilterBar, Pagination, usePaged } from "@/components/ops/ListControls";
import { PaymentDialog } from "@/components/ops/Payments";
import { CallEmail, ContactCell, ServiceChips, fmtDate } from "@/components/ops/Parts";
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
  dateNeeded: string; // YYYY-MM-DD — service needed by
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
  payments: PaymentRecord[];
}

// Header label + column width (% of the table).
const COLS: [string, string][] = [
  ["Name", "27%"],
  ["Date of lead", "12%"],
  ["Service", "21%"],
  ["Service needed by", "13%"],
  ["Status", "15%"],
  ["", "12%"],
];

export function LeadsTable({ leads, canReview }: { leads: LeadRow[]; canReview: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [service, setService] = useState("All");
  const [when, setWhen] = useState("all");
  const [now] = useState(() => Date.now());
  const [openId, setOpenId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (status !== "All" && l.leadStatus !== status) return false;
      if (service !== "All" && !serviceTypesOf(l.services).includes(service)) return false;
      if (when !== "all" && new Date(l.createdAt).getTime() < now - Number(when) * 86_400_000) return false;
      if (!q) return true;
      return [l.firstName, l.lastName, l.companyName, l.email, l.phone, l.city, l.state, ...l.services].join(" ").toLowerCase().includes(q);
    });
  }, [leads, search, status, service, when, now]);

  const paged = usePaged(filtered, `${search}|${status}|${service}|${when}`);
  const open = leads.find((l) => l.id === openId) ?? null;
  const converting = leads.find((l) => l.id === convertId) ?? null;

  // "Converted" can only be reached through the payment popup; every other status is a plain edit.
  async function saveStatus(l: LeadRow, value: string) {
    if (value === "Converted") {
      setConvertId(l.id);
      return { ok: true as const };
    }
    return updateLead(l.id, { leadStatus: value });
  }

  function cells(l: LeadRow) {
    const locked = l.status !== "PENDING";
    return {
      name: <ContactCell compact name={`${l.firstName} ${l.lastName}`.trim()} title={l.title} company={l.companyName} email={l.email} phone={l.phone} />,
      date: fmtDate(l.createdAt),
      service: <ServiceChips services={l.services} kind="type" />,
      needed: fmtDate(l.dateNeeded),
      status: (
        <InlineSelect
          label="Lead status"
          value={l.leadStatus}
          options={LEAD_STATUSES.filter((s) => s !== "Converted" || canReview || l.leadStatus === "Converted")}
          disabled={locked}
          onSave={(v) => saveStatus(l, v)}
        />
      ),
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
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search leads by name, company, email…"
        onClear={() => {
          setSearch("");
          setStatus("All");
          setService("All");
          setWhen("all");
        }}
        filters={[
          { label: "Status", value: status, onChange: setStatus, options: ["All", ...LEAD_STATUSES] },
          { label: "Service", value: service, onChange: setService, options: ["All", ...SERVICE_GROUPS.map((g) => g.group)] },
          {
            label: "Date of lead",
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
          {leads.length === 0
            ? "No leads yet. Quote-form submissions appear here, and you can add one yourself with “+ Add lead”."
            : "No leads match these filters."}
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
                {paged.pageItems.map((l) => {
                  const c = cells(l);
                  return (
                    <tr key={l.id}>
                      <td>{c.name}</td>
                      <td>{c.date}</td>
                      <td>{c.service}</td>
                      <td>{c.needed}</td>
                      <td>{c.status}</td>
                      <td>{c.actions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="dt-cards">
            {paged.pageItems.map((l) => {
              const c = cells(l);
              return (
                <div key={l.id} className="card dt-card">
                  {c.name}
                  <div className="dt-card-grid">
                    <div className="dt-wide">
                      <div className="dt-field-label">Service</div>
                      {c.service}
                    </div>
                    <div>
                      <div className="dt-field-label">Date of lead</div>
                      {c.date}
                    </div>
                    <div>
                      <div className="dt-field-label">Needed by</div>
                      {c.needed}
                    </div>
                    <div className="dt-wide">
                      <div className="dt-field-label">Status</div>
                      {c.status}
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

          <Pagination {...paged} onPage={paged.setPage} />
        </>
      )}

      {open && (
        <LeadDetails
          lead={open}
          canReview={canReview}
          onClose={() => setOpenId(null)}
          onConvert={() => {
            setOpenId(null);
            setConvertId(open.id);
          }}
        />
      )}

      {converting && (
        <PaymentDialog
          mode="convert"
          title={`Convert ${converting.companyName}`}
          defaultTotal={converting.budgetQuote}
          onClose={() => setConvertId(null)}
          onSubmit={async (d) => {
            const res = unwrap(await convertLead(converting.id, d));
            setConvertId(null);
            router.push("/customers");
            router.refresh();
            return res;
          }}
        />
      )}
    </div>
  );
}
