"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unwrap } from "@/lib/actions/result";
import { submitAudit } from "@/lib/actions/audits";

// Sends a completed audit to the admin. It can't be edited or taken back afterwards, so it asks first.
export function SubmitReportButton({ auditId }: { auditId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!window.confirm("Submit this report to the admin? You won't be able to edit it or undo the submission.")) return;
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await submitAudit(auditId));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't submit the report.");
      }
    });
  }

  return (
    <>
      <button type="button" className="btn primary sm" disabled={pending} onClick={submit}>
        {pending ? "Submitting…" : "Submit"}
      </button>
      {error && (
        <span role="alert" style={{ color: "var(--danger)", fontSize: 11.5 }}>
          {error}
        </span>
      )}
    </>
  );
}
