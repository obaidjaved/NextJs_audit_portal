"use client";

import { useEffect, useState } from "react";
import { DetailsDialog } from "@/components/ops/Dialog";
import { unwrap } from "@/lib/actions/result";
import { wasReportSent } from "@/lib/actions/audits";
import { CorrectionDialog } from "./CorrectionDialog";

type Step = "checking" | "warn" | "form";

// "Needs Correction" for a report. If the customer already has it, the admin is reminded first and can go back or carry on.
// The check looks at the report's activity (what was actually emailed or shared), so it is right even for reports sent before this was tracked.
export function NeedsCorrectionFlow({ auditId, title, reportSent, onClose }: { auditId: string; title: string; reportSent: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>(reportSent ? "warn" : "checking");

  useEffect(() => {
    if (step !== "checking") return;
    let cancelled = false;
    wasReportSent(auditId)
      .then((r) => {
        if (!cancelled) setStep(unwrap(r).sent ? "warn" : "form");
      })
      // If the check can't be made, don't block the admin: go on to the instructions.
      .catch(() => !cancelled && setStep("form"));
    return () => {
      cancelled = true;
    };
  }, [auditId, step]);

  if (step === "form") return <CorrectionDialog auditId={auditId} title={title} onClose={onClose} />;

  if (step === "checking") {
    return (
      <DetailsDialog title="Checking this report…" subtitle={title} onClose={onClose}>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)" }}>Checking whether the client has already received it.</p>
      </DetailsDialog>
    );
  }

  return (
    <DetailsDialog title="This report was already sent to the client. Still want to continue?" subtitle={title} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
          The client already has this report. If you send it back for corrections, they are holding a version that may change, and you will need to send the
          corrected report again once it is approved.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn ghost sm" onClick={onClose}>
            Go back
          </button>
          <button type="button" className="btn primary sm" onClick={() => setStep("form")}>
            Continue Anyway
          </button>
        </div>
      </div>
    </DetailsDialog>
  );
}
