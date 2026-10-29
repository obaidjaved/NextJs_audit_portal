"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rejectQuoteRequest } from "@/lib/actions/quote-requests";
import { updateLead } from "@/lib/actions/ops";
import { unwrap } from "@/lib/actions/result";
import { LEAD_STATUSES, money } from "@/lib/ops-options";
import { InlineDate, InlineMoney, InlineSelect } from "@/components/ops/Inline";
import { CallEmail, PaymentPill, fmtDate } from "@/components/ops/Parts";
import { DetailField, DetailsDialog } from "@/components/ops/Dialog";
import { PaymentsList } from "@/components/ops/Payments";
import { ServicePicker } from "@/components/ops/ServicePicker";
import type { LeadRow } from "./LeadsTable";

// Everything about one lead, in a popup. Edits save as you go; Convert opens the payment form.
export function LeadDetails({ lead: l, canReview, onClose, onConvert }: { lead: LeadRow; canReview: boolean; onClose: () => void; onConvert: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const locked = l.status !== "PENDING";
  const balance = l.budgetQuote !== null ? Math.max(l.budgetQuote - l.amountPaid, 0) : null;
  const address = [l.street, l.street2, [l.city, l.state].filter(Boolean).join(", "), l.zip].filter(Boolean).join(", ");

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

        <DetailField label="Service needed by">
          <InlineDate label="Date service is needed by" value={l.dateNeeded} onSave={(v) => updateLead(l.id, { dateNeeded: v ?? l.dateNeeded })} />
        </DetailField>
        <DetailField label="Status">
          <InlineSelect
            label="Lead status"
            value={l.leadStatus}
            options={LEAD_STATUSES.filter((s) => s !== "Converted" || canReview || l.leadStatus === "Converted")}
            disabled={locked}
            onSave={async (v) => {
              if (v === "Converted") {
                onConvert();
                return { ok: true as const };
              }
              return updateLead(l.id, { leadStatus: v });
            }}
          />
        </DetailField>

        <DetailField label="Total amount of deal">
          <InlineMoney label="Total amount of deal" value={l.budgetQuote} disabled={locked} onSave={(v) => updateLead(l.id, { budgetQuote: v })} />
        </DetailField>
        <DetailField label="Payment">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span><PaymentPill status={l.paymentStatus} /></span>
            <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
              Paid {money(l.amountPaid)}
              {balance !== null && l.amountPaid > 0 ? ` · balance ${money(balance)}` : ""}
            </span>
          </div>
        </DetailField>

        {l.payments.length > 0 && (
          <DetailField label="Payments received" wide>
            <PaymentsList payments={l.payments} />
          </DetailField>
        )}

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
                  <Link href="/customers" style={{ textDecoration: "underline", fontWeight: 700 }}>See customers</Link>
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
                <button type="button" className="btn primary sm" disabled={pending} onClick={onConvert}>
                  Convert to customer
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
