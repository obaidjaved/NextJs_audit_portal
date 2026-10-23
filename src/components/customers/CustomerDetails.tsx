"use client";

import Link from "next/link";
import { updateCustomerOps } from "@/lib/actions/ops";
import { PAYMENT_STATUSES, PROGRESS_STATUSES } from "@/lib/ops-options";
import { InlineDate, InlineMoney, InlineSelect } from "@/components/ops/Inline";
import { CallEmail, fmtDate } from "@/components/ops/Parts";
import { DetailField, DetailsDialog } from "@/components/ops/Dialog";
import { ProofManager } from "@/components/ops/ProofManager";
import { ServicePicker } from "@/components/ops/ServicePicker";
import type { CustomerOpsRow } from "./CustomersTable";

// Everything about one customer, in a popup. Edits save as you go.
export function CustomerDetails({
  customer: c,
  auditors,
  canAssign,
  onClose,
}: {
  customer: CustomerOpsRow;
  auditors: { id: string; name: string }[];
  canAssign: boolean;
  onClose: () => void;
}) {
  const auditorOptions = [{ value: "", label: "Unassigned" }, ...auditors.map((a) => ({ value: a.id, label: a.name }))];
  const contactName = c.contact?.split(",")[0]?.trim() ?? "";
  const contactTitle = c.contact?.includes(",") ? c.contact.slice(c.contact.indexOf(",") + 1).trim() : "";
  const place = [c.site, [c.city, c.state].filter(Boolean).join(", "), c.zip].filter(Boolean).join(", ");

  return (
    <DetailsDialog title={c.name} subtitle={[contactName, contactTitle].filter(Boolean).join(" · ")} onClose={onClose}>
      <div className="dtl-grid">
        <DetailField label="Email">{c.email ? <a href={`mailto:${c.email}`} style={{ textDecoration: "underline" }}>{c.email}</a> : "—"}</DetailField>
        <DetailField label="Phone">{c.phone ? <a href={`tel:${c.phone}`} style={{ textDecoration: "underline" }}>{c.phone}</a> : "—"}</DetailField>
        <DetailField label="Location" wide>{place || "—"}</DetailField>

        <DetailField label="Service type & sub service" wide>
          <ServicePicker label="Services" kind="sub" services={c.services} onSave={(s) => updateCustomerOps(c.id, { services: s })} />
        </DetailField>

        <DetailField label="Service required by">
          <InlineDate label="Date of service required" value={c.serviceDate} onSave={(v) => updateCustomerOps(c.id, { serviceDate: v })} />
        </DetailField>
        <DetailField label="Progress">
          <InlineSelect label="Progress status" value={c.progressStatus} options={PROGRESS_STATUSES} onSave={(v) => updateCustomerOps(c.id, { progressStatus: v })} />
        </DetailField>
        <DetailField label="Assigned auditor">
          {canAssign ? (
            <InlineSelect label="Assigned auditor" value={c.assignedAuditorId ?? ""} options={auditorOptions} onSave={(v) => updateCustomerOps(c.id, { assignedAuditorId: v || null })} />
          ) : (
            c.assignedAuditorName ?? "Unassigned"
          )}
        </DetailField>
        <DetailField label="Date assigned">{c.assignedAuditorId ? fmtDate(c.assignedAt) : "—"}</DetailField>
        <DetailField label="Payment status">
          <InlineSelect label="Payment status" value={c.paymentStatus} options={PAYMENT_STATUSES} onSave={(v) => updateCustomerOps(c.id, { paymentStatus: v })} />
        </DetailField>
        <DetailField label="Project value">
          <InlineMoney label="Project value" value={c.projectValue} onSave={(v) => updateCustomerOps(c.id, { projectValue: v })} />
        </DetailField>

        <DetailField label="Final report">
          {c.finalReportId ? (
            <Link href={`/audits/${c.finalReportId}`} className="btn ghost sm">View report{c.finalReportDoc ? ` (${c.finalReportDoc})` : ""}</Link>
          ) : (
            <span style={{ color: "var(--ink-3)" }}>Not ready yet</span>
          )}
        </DetailField>
        <DetailField label="Payment proof" wide>
          <ProofManager proofs={c.paymentProofs} readOnly />
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
