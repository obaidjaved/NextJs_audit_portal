"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { completeCustomer, updateCustomerOps } from "@/lib/actions/ops";
import { unwrap } from "@/lib/actions/result";
import { PROGRESS_STATUSES, serviceTypesOf } from "@/lib/ops-options";
import { SERVICE_GROUPS } from "@/lib/quote-options";
import type { PaymentRecord } from "@/lib/repo-types";
import { AuditorCombobox } from "@/components/ops/AuditorCombobox";
import { InlineSelect } from "@/components/ops/Inline";
import { FilterBar, Pagination, usePaged } from "@/components/ops/ListControls";
import { PaymentDialog, ReminderToast } from "@/components/ops/Payments";
import { CallEmail, ContactCell, ServiceChips, fmtDate } from "@/components/ops/Parts";
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
  ["Name", "21%"],
  ["Date query assigned", "12%"],
  ["Service", "16%"],
  ["Query assigned to", "17%"],
  ["Service needed by", "12%"],
  ["Status", "12%"],
  ["", "10%"],
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
  canAssign: boolean; // administrators assign auditors and complete queries
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [auditor, setAuditor] = useState("All");
  const [service, setService] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [reminderFor, setReminderFor] = useState<string | null>(null);

  const auditorNames = useMemo(() => [...new Set(customers.map((c) => c.assignedAuditorName).filter((n): n is string => !!n))].sort(), [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (status !== "All" && c.progressStatus !== status) return false;
      if (auditor === "Unassigned" ? !!c.assignedAuditorId : auditor !== "All" && c.assignedAuditorName !== auditor) return false;
      if (service !== "All" && !serviceTypesOf(c.services).includes(service)) return false;
      if (!q) return true;
      return [c.name, c.contact, c.email, c.phone, c.assignedAuditorName, ...c.services].join(" ").toLowerCase().includes(q);
    });
  }, [customers, search, status, auditor, service]);

  const paged = usePaged(filtered, `${search}|${status}|${auditor}|${service}`);
  const open = customers.find((c) => c.id === openId) ?? null;
  const completing = customers.find((c) => c.id === completeId) ?? null;
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
      auditor: canAssign ? (
        <AuditorCombobox value={c.assignedAuditorId} auditors={auditors} onSave={(id) => updateCustomerOps(c.id, { assignedAuditorId: id })} />
      ) : (
        <span style={{ fontWeight: 600 }}>{c.assignedAuditorName ?? "Unassigned"}</span>
      ),
      needed: fmtDate(c.serviceDate),
      status: (
        <InlineSelect
          label="Status"
          value={c.progressStatus}
          options={PROGRESS_STATUSES.filter((s) => s !== "Completed" || canAssign || c.progressStatus === "Completed")}
          disabled={c.progressStatus === "Completed" && !canAssign}
          onSave={(v) => saveStatus(c, v)}
        />
      ),
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
        }}
        filters={[
          { label: "Status", value: status, onChange: setStatus, options: ["All", ...PROGRESS_STATUSES] },
          { label: "Auditor", value: auditor, onChange: setAuditor, options: ["All", "Unassigned", ...auditorNames] },
          { label: "Service", value: service, onChange: setService, options: ["All", ...SERVICE_GROUPS.map((g) => g.group)] },
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
                    <div className="dt-wide">
                      <div className="dt-field-label">Status</div>
                      {c.status}
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
          auditors={auditors}
          canAssign={canAssign}
          onClose={() => setOpenId(null)}
          onComplete={() => {
            setOpenId(null);
            setCompleteId(open.id);
          }}
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
