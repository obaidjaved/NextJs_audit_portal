"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveAudit } from "@/lib/actions/audits";

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
        await approveAudit(auditId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to approve.");
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
