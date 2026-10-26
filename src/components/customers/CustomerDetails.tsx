"use client";

import Link from "next/link";
import { updateCustomerOps } from "@/lib/actions/ops";
import { PROGRESS_STATUSES, money } from "@/lib/ops-options";
import { AuditorCombobox } from "@/components/ops/AuditorCombobox";
import { InlineDate, InlineMoney, InlineSelect } from "@/components/ops/Inline";
import { CallEmail, PaymentPill, fmtDate } from "@/components/ops/Parts";
import { DetailField, DetailsDialog } from "@/components/ops/Dialog";
import { PaymentsList } from "@/components/ops/Payments";
import { ServicePicker } from "@/components/ops/ServicePicker";
import type { CustomerOpsRow } from "./CustomersTable";

// Everything about one customer, in a popup. Edits save as you go; Completed opens the payment check.
export function CustomerDetails({
  customer: c,
  auditors,
  canAssign,
  onClose,
  onComplete,
}: {
  customer: CustomerOpsRow;
  auditors: { id: string; name: string }[];
  canAssign: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const contactName = c.contact?.split(",")[0]?.trim() ?? "";
  const contactTitle = c.contact?.includes(",") ? c.contact.slice(c.contact.indexOf(",") + 1).trim() : "";
  const place = [c.site, [c.city, c.state].filter(Boolean).join(", "), c.zip].filter(Boolean).join(", ");
  const balance = c.projectValue !== null ? Math.max(c.projectValue - c.amountPaid, 0) : null;

  return (
    <DetailsDialog title={c.name} subtitle={[contactName, contactTitle].filter(Boolean).join(" · ")} onClose={onClose}>
      <div className="dtl-grid">
        <DetailField label="Email">{c.email ? <a href={`mailto:${c.email}`} style={{ textDecoration: "underline" }}>{c.email}</a> : "—"}</DetailField>
        <DetailField label="Phone">{c.phone ? <a href={`tel:${c.phone}`} style={{ textDecoration: "underline" }}>{c.phone}</a> : "—"}</DetailField>
        <DetailField label="Location" wide>{place || "—"}</DetailField>

        <DetailField label="Service type & sub service" wide>
          <ServicePicker label="Services" kind="sub" services={c.services} onSave={(s) => updateCustomerOps(c.id, { services: s })} />
        </DetailField>

        <DetailField label="Query assigned to">
          {canAssign ? (
            <AuditorCombobox value={c.assignedAuditorId} auditors={auditors} onSave={(id) => updateCustomerOps(c.id, { assignedAuditorId: id })} />
          ) : (
            c.assignedAuditorName ?? "Unassigned"
          )}
        </DetailField>
        <DetailField label="Date query assigned">{c.assignedAuditorId ? fmtDate(c.assignedAt) : "—"}</DetailField>

        <DetailField label="Service needed by">
          <InlineDate label="Date service is needed by" value={c.serviceDate} onSave={(v) => updateCustomerOps(c.id, { serviceDate: v })} />
        </DetailField>
        <DetailField label="Status">
          {c.progressStatus === "Completed" && !canAssign ? (
            "Completed"
          ) : (
            <InlineSelect
              label="Status"
              value={c.progressStatus}
              options={PROGRESS_STATUSES.filter((s) => s !== "Completed" || canAssign || c.progressStatus === "Completed")}
              onSave={async (v) => {
                if (v === "Completed") {
                  onComplete();
                  return { ok: true as const };
                }
                return updateCustomerOps(c.id, { progressStatus: v as "In progress" | "Rescheduled" });
              }}
            />
          )}
        </DetailField>

        <DetailField label="Total amount of deal">
          <InlineMoney label="Total amount of deal" value={c.projectValue} onSave={(v) => updateCustomerOps(c.id, { projectValue: v })} />
        </DetailField>
        <DetailField label="Payment">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span><PaymentPill status={c.paymentStatus} /></span>
            <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
              Paid {money(c.amountPaid)}
              {balance !== null && balance > 0 ? ` · balance ${money(balance)}` : ""}
            </span>
          </div>
        </DetailField>

        {c.payments.length > 0 && (
          <DetailField label="Payments received" wide>
            <PaymentsList payments={c.payments} />
          </DetailField>
        )}

        <DetailField label="Final report" wide>
          {c.finalReportId ? (
            <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
              <a href={`/api/audits/${c.finalReportId}/pdf?inline=1`} target="_blank" rel="noreferrer" className="btn ghost sm">Preview PDF</a>
              <a href={`/api/audits/${c.finalReportId}/pdf`} className="btn ghost sm">Download PDF</a>
              <Link href={`/audits/${c.finalReportId}`} className="btn ghost sm">Open audit{c.finalReportDoc ? ` (${c.finalReportDoc})` : ""}</Link>
            </span>
          ) : (
            <span style={{ color: "var(--ink-3)" }}>Not ready yet</span>
          )}
        </DetailField>
      </div>

      <div className="dtl-foot">
        <CallEmail email={c.email} phone={c.phone} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: "auto" }}>
          <Link href={`/customers/${c.id}/edit`} className="btn ghost sm">Edit customer</Link>
          <Link href={`/customers?customerId=${c.id}`} className="btn primary sm">Audits &amp; history</Link>
        </div>
      </div>
    </DetailsDialog>
  );
}
