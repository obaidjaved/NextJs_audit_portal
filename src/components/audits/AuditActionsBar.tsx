"use client";

import Link from "next/link";
import { unwrap } from "@/lib/actions/result";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveAudit, duplicateAudit } from "@/lib/actions/audits";
import { CorrectionDialog } from "./CorrectionDialog";
import { SubmitReportButton } from "./SubmitReportButton";

export function AuditActionsBar({
  auditId,
  draft,
  pendingApproval,
  canApprove,
  title = "",
  isAdmin = true,
  readyToSubmit = false,
  canEdit = true,
  needsCorrection = false,
}: {
  auditId: string;
  draft: boolean;
  pendingApproval: boolean;
  canApprove: boolean;
  title?: string;
  isAdmin?: boolean;
  readyToSubmit?: boolean;
  canEdit?: boolean;
  needsCorrection?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState(false);

  function approve() {
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await approveAudit(auditId));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to approve.");
      }
    });
  }

  function duplicate() {
    setError(null);
    startTransition(async () => {
      try {
        const copy = unwrap(await duplicateAudit(auditId));
        router.push(`/audits/${copy.id}/edit`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to duplicate.");
      }
    });
  }

  // The auditor's page after completing an audit: just "Edit Report" and "Submit" (and nothing once it has been submitted).
  if (!isAdmin) {
    return (
      <div className="no-print" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canEdit && (
            <Link href={`/audits/${auditId}/edit`} className={readyToSubmit ? "btn ghost sm" : "btn primary sm"}>
              {draft && !needsCorrection ? "Continue" : "Edit Report"}
            </Link>
          )}
          {readyToSubmit && <SubmitReportButton auditId={auditId} />}
        </div>
        {!canEdit && (
          <p style={{ fontSize: 12, color: "var(--ink-2)", margin: 0, maxWidth: 260, textAlign: "right" }}>
            Submitted to the admin. It can only be edited if the admin sends it back for corrections.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="no-print" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => window.print()}
          title="Opens your browser's print dialog — choose &quot;Save as PDF&quot; as the destination, then click Print to download it"
        >
          Print / Save as PDF
        </button>
        {canEdit && (
          <Link href={`/audits/${auditId}/edit`} className="btn ghost sm">
            {needsCorrection ? "Edit report" : draft ? "Continue" : "Edit"}
          </Link>
        )}
        <button type="button" className="btn ghost sm" disabled={pending} onClick={duplicate}>
          Duplicate
        </button>
        {canApprove && !draft && (
          <button type="button" className="btn ghost sm" disabled={pending} onClick={() => setCorrecting(true)}>
            Needs corrections
          </button>
        )}
        {pendingApproval && canApprove && (
          <button type="button" className="btn primary sm" disabled={pending} onClick={approve}>
            {pending ? "Approving…" : "Approve Audit"}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{error}</p>}
      {correcting && <CorrectionDialog auditId={auditId} title={title} onClose={() => setCorrecting(false)} />}
    </div>
  );
}
