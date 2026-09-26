import Link from "next/link";
import type { DashboardAudit } from "@/lib/dashboard";
import { auditStatus } from "@/lib/scoring";

const GRADIENT: Record<string, string> = {
  Flagged: "linear-gradient(135deg,#FF7A1A,#D6483A)",
  "Pending Approval": "linear-gradient(135deg,#7C9CFF,#2E4FB0)",
  "In Progress": "linear-gradient(135deg,#7C9CFF,#2E4FB0)",
  Marginal: "linear-gradient(135deg,#F6C744,#D9600B)",
  Cleared: "linear-gradient(135deg,#3FB983,#1E8E5A)",
};

export function FeatureCard({ audit }: { audit: DashboardAudit | null }) {
  if (!audit) {
    return (
      <div className="card feature-card" style={{ minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--ink-2)", fontSize: 13, padding: 20, textAlign: "center" }}>
          Complete your first audit to see it featured here.
        </p>
      </div>
    );
  }

  const status = auditStatus(audit);
  const gradient = GRADIENT[status] ?? GRADIENT.Cleared;

  return (
    <Link href={`/audits/${audit.id}`} className="card feature-card">
      <div className="feature-visual" style={{ background: gradient }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M13 2 3 14h7l-1 8 11-14h-8l1-6Z" />
        </svg>
      </div>
      <div className="feature-foot">
        <div>
          <h4>{audit.title}</h4>
          <p>{audit.docNumber} · {audit.customerName}</p>
        </div>
        <span className="score-pill">{audit.draft ? "Draft" : `${(audit.score ?? 0).toFixed(1)}%`}</span>
      </div>
    </Link>
  );
}
