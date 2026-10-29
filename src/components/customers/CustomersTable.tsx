"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { completeCustomer, updateCustomerOps } from "@/lib/actions/ops";
import { unwrap } from "@/lib/actions/result";
import { PROGRESS_STATUSES, serviceTypesOf } from "@/lib/ops-options";
import { SERVICE_GROUPS } from "@/lib/quote-options";
import type { PaymentRecord } from "@/lib/repo-types";
import { InlineSelect } from "@/components/ops/Inline";
import { FilterBar, Pagination, usePaged } from "@/components/ops/ListControls";
import { PaymentHistoryDialog } from "@/components/ops/PaymentHistory";
import { PaymentDialog, ReminderToast } from "@/components/ops/Payments";
import { CallEmail, ContactCell, PaymentPill, ServiceChips, fmtDate } from "@/components/ops/Parts";
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
  serviceDate: string | null; // service needed by
  assignedAuditorId: string | null;
  assignedAuditorName: string | null;
  assignedAt: string | null; // ISO — date the query was assigned
  paymentStatus: string;
  projectValue: number | null; // total amount of the deal
  amountPaid: number;
  progressStatus: string;
  paymentProofs: string[];
  payments: PaymentRecord[];
  // The newest finished audit, shown as the "Final report".
  finalReportId: string | null;
  finalReportDoc: string | null;
}

// Header label + column width (% of the table).
const COLS: [string, string][] = [
  ["Name", "17%"],
  ["Date query assigned", "10%"],
  ["Service", "13%"],
  ["Assigned to", "11%"],
  ["Service needed by", "10%"],
  ["Status", "11%"],
  ["Payment status", "11%"],
  ["", "17%"],
];

// "First Last, Title" -> name + title
function splitContact(contact: string | null): { name: string; title: string | null } {
  if (!contact) return { name: "", title: null };
  const i = contact.indexOf(",");
  return i === -1 ? { name: contact.trim(), title: null } : { name: contact.slice(0, i).trim(), title: contact.slice(i + 1).trim() || null };
}

export function CustomersTable({ customers, isAdmin }: { customers: CustomerOpsRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [auditor, setAuditor] = useState("All");
  const [service, setService] = useState("All");
  const [payment, setPayment] = useState("All");
  const [when, setWhen] = useState("all");
  const [now] = useState(() => Date.now());
  const [openId, setOpenId] = useState<string | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [payId, setPayId] = useState<string | null>(null);
  const [reminderFor, setReminderFor] = useState<string | null>(null);

  const auditorNames = useMemo(() => [...new Set(customers.map((c) => c.assignedAuditorName).filter((n): n is string => !!n))].sort(), [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (status !== "All" && c.progressStatus !== status) return false;
      if (auditor === "Unassigned" ? !!c.assignedAuditorId : auditor !== "All" && c.assignedAuditorName !== auditor) return false;
      if (service !== "All" && !serviceTypesOf(c.services).includes(service)) return false;
      if (payment !== "All" && c.paymentStatus !== payment) return false;
      if (when !== "all" && (!c.assignedAt || new Date(c.assignedAt).getTime() < now - Number(when) * 86_400_000)) return false;
      if (!q) return true;
      return [c.name, c.contact, c.email, c.phone, c.assignedAuditorName, ...c.services].join(" ").toLowerCase().includes(q);
    });
  }, [customers, search, status, auditor, service, payment, when, now]);

  const paged = usePaged(filtered, `${search}|${status}|${auditor}|${service}|${payment}|${when}`);
  const open = customers.find((c) => c.id === openId) ?? null;
  const completing = customers.find((c) => c.id === completeId) ?? null;
  const paying = customers.find((c) => c.id === payId) ?? null;
  const closeReminder = useCallback(() => setReminderFor(null), []);

  // "Completed" opens the payment check first; the other statuses are plain edits.
  async function saveStatus(c: CustomerOpsRow, value: string) {
    if (value === "Completed") {
      setCompleteId(c.id);
      return { ok: true as const };
    }
    return updateCustomerOps(c.id, { progressStatus: value as "In progress" | "Rescheduled" });
  }

  function cells(c: CustomerOpsRow) {
    const { name, title } = splitContact(c.contact);
    return {
      name: <ContactCell compact name={name} title={title} company={c.name} email={c.email} phone={c.phone} />,
      assigned: c.assignedAuditorId ? fmtDate(c.assignedAt) : "—",
      service: <ServiceChips services={c.services} kind="type" />,
      // Auditors are assigned on the Audits tab; this is just who has it.
      auditor: c.assignedAuditorName ? <span style={{ fontWeight: 600 }}>{c.assignedAuditorName}</span> : <span style={{ color: "var(--ink-3)" }}>Not assigned yet</span>,
      needed: fmtDate(c.serviceDate),
      status: (
        <InlineSelect
          label="Status"
          value={c.progressStatus}
          options={PROGRESS_STATUSES.filter((s) => s !== "Completed" || isAdmin || c.progressStatus === "Completed")}
          disabled={c.progressStatus === "Completed" && !isAdmin}
          onSave={(v) => saveStatus(c, v)}
        />
      ),
      payment: <PaymentPill status={c.paymentStatus} onClick={() => setPayId(c.id)} />,
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
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search customers by name, company, auditor…"
        onClear={() => {
          setSearch("");
          setStatus("All");
          setAuditor("All");
          setService("All");
          setPayment("All");
          setWhen("all");
        }}
        filters={[
          { label: "Status", value: status, onChange: setStatus, options: ["All", ...PROGRESS_STATUSES] },
          { label: "Auditor", value: auditor, onChange: setAuditor, options: ["All", "Unassigned", ...auditorNames] },
          { label: "Service", value: service, onChange: setService, options: ["All", ...SERVICE_GROUPS.map((g) => g.group)] },
          {
            label: "Payment",
            value: payment,
            onChange: setPayment,
            options: [
              { value: "All", label: "All" },
              { value: "Full Payment", label: "Fully paid" },
              { value: "Partial", label: "Partial" },
              { value: "None", label: "Not paid" },
            ],
          },
          {
            label: "Date assigned",
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
          {customers.length === 0 ? "No customers yet. Add one with “+ New Customer”, or convert a lead." : "No customers match these filters."}
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
                {paged.pageItems.map((cu) => {
                  const c = cells(cu);
                  return (
                    <tr key={cu.id}>
                      <td>{c.name}</td>
                      <td>{c.assigned}</td>
                      <td>{c.service}</td>
                      <td>{c.auditor}</td>
                      <td>{c.needed}</td>
                      <td>{c.status}</td>
                      <td>{c.payment}</td>
                      <td>{c.actions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="dt-cards">
            {paged.pageItems.map((cu) => {
              const c = cells(cu);
              return (
                <div key={cu.id} className="card dt-card">
                  {c.name}
                  <div className="dt-card-grid">
                    <div className="dt-wide">
                      <div className="dt-field-label">Service</div>
                      {c.service}
                    </div>
                    <div>
                      <div className="dt-field-label">Query assigned</div>
                      {c.assigned}
                    </div>
                    <div>
                      <div className="dt-field-label">Needed by</div>
                      {c.needed}
                    </div>
                    <div className="dt-wide">
                      <div className="dt-field-label">Assigned to</div>
                      {c.auditor}
                    </div>
                    <div>
                      <div className="dt-field-label">Status</div>
                      {c.status}
                    </div>
                    <div>
                      <div className="dt-field-label">Payment</div>
                      {c.payment}
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

          <Pagination {...paged} onPage={paged.setPage} />
        </>
      )}

      {open && (
        <CustomerDetails
          customer={open}
          isAdmin={isAdmin}
          onClose={() => setOpenId(null)}
          onPayments={() => {
            setOpenId(null);
            setPayId(open.id);
          }}
          onComplete={() => {
            setOpenId(null);
            setCompleteId(open.id);
          }}
        />
      )}

      {paying && (
        <PaymentHistoryDialog
          customerId={paying.id}
          name={paying.name}
          total={paying.projectValue}
          paid={paying.amountPaid}
          status={paying.paymentStatus}
          payments={paying.payments}
          canRecord={isAdmin}
          onClose={() => setPayId(null)}
        />
      )}

      {completing && (
        <PaymentDialog
          mode="complete"
          title={`Complete ${completing.name}`}
          auditor={completing.assignedAuditorName}
          total={completing.projectValue}
          paid={completing.amountPaid}
          paymentStatus={completing.paymentStatus}
          assigned={!!completing.assignedAuditorId}
          hasReport={!!completing.finalReportId}
          hasPayments={completing.payments.length > 0}
          onClose={() => setCompleteId(null)}
          onSubmit={async (details) => {
            const res = unwrap(await completeCustomer(completing.id, details));
            setCompleteId(null);
            setReminderFor(completing.name);
            router.refresh();
            return res;
          }}
        />
      )}

      {reminderFor && <ReminderToast onClose={closeReminder} onGo={() => router.push(`/audits?q=${encodeURIComponent(reminderFor)}`)} />}
    </div>
  );
}
