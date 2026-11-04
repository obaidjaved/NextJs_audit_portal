"use client";

import { useState } from "react";
import { DetailsDialog } from "@/components/ops/Dialog";
import { CorrectionDialog } from "./CorrectionDialog";

// "Needs Correction" for a report. If the customer already has it, the admin is reminded first and can go back or carry on.
export function NeedsCorrectionFlow({ auditId, title, reportSent, onClose }: { auditId: string; title: string; reportSent: boolean; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(!reportSent);

  if (confirmed) return <CorrectionDialog auditId={auditId} title={title} onClose={onClose} />;

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
          <button type="button" className="btn primary sm" onClick={() => setConfirmed(true)}>
            Continue Anyway
          </button>
        </div>
      </div>
    </DetailsDialog>
  );
}
