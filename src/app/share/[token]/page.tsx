import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { audits } from "@/lib/repo";
import { AuditReport } from "@/components/audits/AuditReport";
import { PrintButton } from "@/components/audits/PrintButton";

// Public, unauthenticated, read-only report. The unguessable token is the only credential.
export const metadata: Metadata = { title: "Inspection Report", robots: { index: false, follow: false } };

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const audit = await audits.getByToken(token);
  // A shared audit that was later reopened for editing stops being viewable.
  if (!audit || audit.draft || audit.pendingApproval) notFound();

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--accent-ink)" }}>TAP Services</span>
        <PrintButton />
      </div>
      <AuditReport audit={audit} />
    </main>
  );
}
