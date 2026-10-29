"use client";

import Link from "next/link";
import { unwrap } from "@/lib/actions/result";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveAudit, duplicateAudit } from "@/lib/actions/audits";

export function AuditActionsBar({
  auditId,
  draft,
  pendingApproval,
  canApprove,
}: {
  auditId: string;
  draft: boolean;
  pendingApproval: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        <Link href={`/audits/${auditId}/edit`} className="btn ghost sm">
          {draft ? "Continue" : "Edit"}
        </Link>
        <button type="button" className="btn ghost sm" disabled={pending} onClick={duplicate}>
          Duplicate
        </button>
        {pendingApproval && canApprove && (
          <button type="button" className="btn primary sm" disabled={pending} onClick={approve}>
            {pending ? "Approving…" : "Approve Audit"}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{error}</p>}
    </div>
  );
}
