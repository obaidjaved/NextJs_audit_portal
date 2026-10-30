"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unwrap } from "@/lib/actions/result";
import { setAuditReview } from "@/lib/actions/audits";
import { CorrectionDialog } from "./CorrectionDialog";

const OPTIONS = ["Approved", "Needs Correction"];

// The admin's Approved / Needs Correction dropdown. "Needs Correction" asks for instructions first.
export function ReviewSelect({ auditId, value, title }: { auditId: string; value: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState(false);

  function choose(next: string) {
    setError(null);
    if (next === "Needs Correction") {
      setCorrecting(true);
      return;
    }
    startTransition(async () => {
      try {
        unwrap(await setAuditReview(auditId, "Approved"));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  return (
    <div>
      <select className="select dt-select" aria-label="Review status" value={value} disabled={pending} onChange={(e) => choose(e.target.value)}>
        {!OPTIONS.includes(value) && <option value={value}>{value}</option>}
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && (
        <div role="alert" style={{ color: "var(--danger)", fontSize: 11.5, marginTop: 4, maxWidth: 200, whiteSpace: "normal" }}>
          {error}
        </div>
      )}
      {correcting && <CorrectionDialog auditId={auditId} title={title} onClose={() => setCorrecting(false)} />}
    </div>
  );
}
