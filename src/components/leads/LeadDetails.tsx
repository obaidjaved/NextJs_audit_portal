"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { approveQuoteRequest, rejectQuoteRequest } from "@/lib/actions/quote-requests";
import { unwrap } from "@/lib/actions/result";
import { updateLead } from "@/lib/actions/ops";
import { LEAD_STATUSES, PAYMENT_STATUSES, money } from "@/lib/ops-options";
import { InlineDate, InlineMoney, InlineSelect } from "@/components/ops/Inline";
import { CallEmail, fmtDate } from "@/components/ops/Parts";
import { DetailField, DetailsDialog } from "@/components/ops/Dialog";
import { ProofManager } from "@/components/ops/ProofManager";
import { ServicePicker } from "@/components/ops/ServicePicker";
import type { LeadRow } from "./LeadsTable";

// Everything about one lead, in a popup. Edits save as you go; Convert turns it into a customer.
export function LeadDetails({ lead: l, canReview, onClose }: { lead: LeadRow; canReview: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasProof = l.paymentProofs.length > 0;
  const locked = l.status !== "PENDING";
  const balance = l.budgetQuote !== null ? Math.max(l.budgetQuote - l.amountPaid, 0) : null;
  const address = [l.street, l.street2, [l.city, l.state].filter(Boolean).join(", "), l.zip].filter(Boolean).join(", ");

  function convert() {
    if (!confirm(`Convert ${l.companyName} into a customer?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = unwrap(await approveQuoteRequest(l.id));
        router.push(res.ok && res.customerId ? `/customers?customerId=${res.customerId}` : "/customers");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't convert this lead.");
      }
    });
  }

  function reject() {
    const note = prompt(`Reject ${l.companyName}? Optionally add a note for your records:`);
    if (note === null) return;
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await rejectQuoteRequest(l.id, note));
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't reject this lead.");
      }
    });
  }

  return (
    <DetailsDialog title={`${l.firstName} ${l.lastName}`.trim() || l.companyName} subtitle={[l.title, l.companyName].filter(Boolean).join(" | ")} onClose={onClose}>
      <div className="dtl-grid" style={{ opacity: pending ? 0.6 : 1 }}>
        <DetailField label="Email">{l.email ? <a href={`mailto:${l.email}`} style={{ textDecoration: "underline" }}>{l.email}</a> : "—"}</DetailField>
        <DetailField label="Phone">{l.phone ? <a href={`tel:${l.phone}`} style={{ textDecoration: "underline" }}>{l.phone}</a> : "—"}</DetailField>
        <DetailField label="Date of lead">{fmtDate(l.createdAt)}</DetailField>
        <DetailField label="Location">{address || "—"}</DetailField>

        <DetailField label="Service type & sub service" wide>
          <ServicePicker label="Services" kind="sub" services={l.services} requireOne onSave={(s) => updateLead(l.id, { services: s })} />
        </DetailField>

        <DetailField label="Service required by">
          <InlineDate label="Date of service required" value={l.dateNeeded} onSave={(v) => updateLead(l.id, { dateNeeded: v ?? l.dateNeeded })} />
        </DetailField>
        <DetailField label="Lead status">
          <InlineSelect
            label="Lead status"
            value={l.leadStatus}
            options={LEAD_STATUSES.filter((s) => s !== "Converted" || l.leadStatus === "Converted")}
            disabled={locked}
            onSave={(v) => updateLead(l.id, { leadStatus: v })}
          />
        </DetailField>
        <DetailField label="Payment status">
          <InlineSelect label="Payment status" value={l.paymentStatus} options={PAYMENT_STATUSES} onSave={(v) => updateLead(l.id, { paymentStatus: v })} />
        </DetailField>
        <DetailField label="Budget quote">
          <InlineMoney label="Budget quote" value={l.budgetQuote} onSave={(v) => updateLead(l.id, { budgetQuote: v })} />
        </DetailField>
        <DetailField label="Record payment (amount received)">
          <InlineMoney label="Amount paid" value={l.amountPaid} nullable={false} onSave={(v) => updateLead(l.id, { amountPaid: v ?? 0 })} />
          {balance !== null && <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>Balance {money(balance)}</div>}
        </DetailField>

        <DetailField label="Payment proof" wide>
          <ProofManager proofs={l.paymentProofs} readOnly={l.status === "REJECTED"} onSave={(p) => updateLead(l.id, { paymentProofs: p })} />
        </DetailField>

        {l.additionalInfo && (
          <DetailField label="Additional info" wide>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{l.additionalInfo}</p>
          </DetailField>
        )}

        {locked && (
          <DetailField label="Review" wide>
            <p style={{ color: "var(--ink-2)" }}>
              {l.status === "APPROVED" ? "Converted" : "Rejected"}
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
          </DetailField>
        )}
      </div>

      {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</p>}

      <div className="dtl-foot">
        <CallEmail email={l.email} phone={l.phone} />
        {l.status === "PENDING" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginLeft: "auto" }}>
            {canReview ? (
              <>
                {!hasProof && <span style={{ fontSize: 12, color: "var(--ink-2)", maxWidth: 240 }}>Attach a transfer screenshot or invoice to convert.</span>}
                <button type="button" className="btn primary sm" disabled={pending || !hasProof} onClick={convert} title={hasProof ? "" : "Payment proof needed"}>
                  {pending ? "Working…" : "Convert to customer"}
                </button>
                <button type="button" className="btn ghost sm" disabled={pending} onClick={reject}>Reject</button>
              </>
            ) : (
              <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Only an administrator can convert or reject leads.</span>
            )}
          </div>
        )}
      </div>
    </DetailsDialog>
  );
}
