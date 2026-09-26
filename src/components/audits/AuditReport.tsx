import type { ReactNode } from "react";
import { auditStatus, type ResponseObject } from "@/lib/scoring";
import { FindingsList } from "./FindingsList";

export const STATUS_PILL_CLASS: Record<string, string> = {
  "In Progress": "pending",
  "Pending Approval": "pending",
  Flagged: "danger",
  Cleared: "ok",
  Marginal: "warn",
};

const LABEL_STYLE = { fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em" } as const;

export interface ReportAudit {
  docNumber: string;
  title: string;
  date: Date;
  score: number | null;
  draft: boolean;
  pendingApproval: boolean;
  criticalFail: boolean;
  notes: string;
  responses: unknown;
  photos: unknown;
  signature: string | null;
  customer: { name: string; site: string | null };
  inspector: { name: string } | null;
}

export function AuditReport({ audit, headerSlot }: { audit: ReportAudit; headerSlot?: ReactNode }) {
  const status = auditStatus(audit);
  const responses = Array.isArray(audit.responses) ? (audit.responses as ResponseObject[]) : [];
  const photos = Array.isArray(audit.photos) ? (audit.photos as { id: string; src: string }[]) : [];

  return (
    <div className="card" style={{ padding: 28, maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span className={`pill ${STATUS_PILL_CLASS[status]}`}>{status}</span>
            <span className="mono" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{audit.docNumber}</span>
          </div>
          <h1 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>{audit.title}</h1>
          <p style={{ fontSize: 13, color: "var(--ink-2)" }}>
            {audit.customer.name}
            {audit.customer.site ? ` · ${audit.customer.site}` : ""} ·{" "}
            {audit.date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>
          {audit.inspector && <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Inspector: {audit.inspector.name}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          {audit.score !== null && <div className="mono" style={{ fontSize: 30, fontWeight: 700 }}>{audit.score}</div>}
          {headerSlot}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ ...LABEL_STYLE, marginBottom: 4 }}>Findings</div>
        <FindingsList responses={responses} />
      </div>

      {audit.notes && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 8 }}>Notes</div>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>{audit.notes}</p>
        </div>
      )}

      {photos.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 8 }}>Photo Evidence</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.src} alt="" style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 12, border: "1px solid var(--rule)" }} />
            ))}
          </div>
        </div>
      )}

      {audit.signature && (
        <div>
          <div style={{ ...LABEL_STYLE, marginBottom: 8 }}>Inspector Signature</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={audit.signature} alt="" style={{ maxWidth: 220, background: "#fff", borderRadius: 10, border: "1px solid var(--rule)" }} />
        </div>
      )}
    </div>
  );
}
