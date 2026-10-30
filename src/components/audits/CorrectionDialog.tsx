"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unwrap } from "@/lib/actions/result";
import { setAuditReview } from "@/lib/actions/audits";
import { DetailsDialog } from "@/components/ops/Dialog";
import { MAX_CORRECTION_NOTE } from "@/lib/audit-review";

// The admin's pop-up when sending a report back: say where the correction is needed. The auditor sees this note on the report.
export function CorrectionDialog({ auditId, title, onClose }: { auditId: string; title: string; onClose: () => void }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setError(null);
    if (!note.trim()) {
      setError("Please tell the auditor what needs to be corrected.");
      return;
    }
    startTransition(async () => {
      try {
        unwrap(await setAuditReview(auditId, "Needs Correction", note));
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't send it back.");
      }
    });
  }

  return (
    <DetailsDialog title="Needs corrections" subtitle={title} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label htmlFor="correction-note" style={{ fontSize: 13, fontWeight: 600 }}>
          Where is the correction required?
        </label>
        <textarea
          id="correction-note"
          className="input"
          rows={6}
          maxLength={MAX_CORRECTION_NOTE}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For example: Section 3 photos are missing, and the panel rating in item 12 looks wrong."
          style={{ resize: "vertical" }}
        />
        <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
          The auditor sees this on the report, and the report opens for editing until they submit it again.
        </div>
        {error && (
          <div role="alert" style={{ color: "var(--danger)", fontSize: 12.5 }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn ghost sm" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="btn primary sm" onClick={send} disabled={pending}>
            {pending ? "Sending…" : "Send back to auditor"}
          </button>
        </div>
      </div>
    </DetailsDialog>
  );
}
