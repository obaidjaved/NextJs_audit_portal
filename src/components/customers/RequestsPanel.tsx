"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveQuoteRequest, rejectQuoteRequest } from "@/lib/actions/quote-requests";

export interface RequestRow {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  title: string | null;
  street: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  services: string[];
  trainings: string[];
  dateNeeded: string; // YYYY-MM-DD
  additionalInfo: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string; // ISO
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  customerId: string | null;
}

const LABEL = { fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 } as const;
const STATUS_PILL = { PENDING: "warn", APPROVED: "ok", REJECTED: "danger" } as const;

function fmtDate(iso: string, withYear = true) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
}
function fmtDateOnly(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function RequestCard({ r, canReview }: { r: RequestRow; canReview: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(r.status === "PENDING");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function approve() {
    if (!confirm(`Approve ${r.companyName} and add it to your customers?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await approveQuoteRequest(r.id);
        router.push(res.customerId ? `/customers?customerId=${res.customerId}` : "/customers");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to approve.");
      }
    });
  }

  function reject() {
    const note = prompt(`Reject ${r.companyName}? Optionally add a note for your records:`);
    if (note === null) return;
    setError(null);
    startTransition(async () => {
      try {
        await rejectQuoteRequest(r.id, note);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reject.");
      }
    });
  }

  return (
    <div className="card" style={{ overflow: "hidden", opacity: pending ? 0.6 : 1 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ display: "flex", width: "100%", alignItems: "center", gap: 12, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "inherit" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14.5 }}>{r.companyName}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
            {r.firstName} {r.lastName} · {r.city}, {r.state} · received {fmtDate(r.createdAt)}
          </div>
        </div>
        <span className={`pill ${STATUS_PILL[r.status]}`}>{r.status === "PENDING" ? "Awaiting review" : r.status === "APPROVED" ? "Approved" : "Rejected"}</span>
        <span aria-hidden="true" style={{ color: "var(--ink-3)" }}>{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 16, borderTop: "1px solid var(--rule)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, paddingTop: 16 }}>
            <div>
              <div style={LABEL}>Contact</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                {r.firstName} {r.lastName}
                {r.title && <div style={{ color: "var(--ink-2)" }}>{r.title}</div>}
                <div><a href={`mailto:${r.email}`} style={{ textDecoration: "underline" }}>{r.email}</a></div>
                <div><a href={`tel:${r.phone}`} style={{ textDecoration: "underline" }}>{r.phone}</a></div>
              </div>
            </div>
            <div>
              <div style={LABEL}>Address</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                {r.street}
                {r.street2 && <div>{r.street2}</div>}
                <div>{r.city}, {r.state} {r.zip}</div>
              </div>
            </div>
            <div>
              <div style={LABEL}>Date needed</div>
              <div style={{ fontSize: 13.5 }}>{fmtDateOnly(r.dateNeeded)}</div>
            </div>
          </div>

          <div>
            <div style={LABEL}>Services requested ({r.services.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {r.services.map((s) => (
                <span key={s} className="pill accent" style={{ textTransform: "none", letterSpacing: 0 }}>{s}</span>
              ))}
            </div>
          </div>

          <div>
            <div style={LABEL}>Training requested</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {r.trainings.map((t) => (
                <span key={t} className="pill pending" style={{ textTransform: "none", letterSpacing: 0 }}>{t}</span>
              ))}
            </div>
          </div>

          {r.additionalInfo && (
            <div>
              <div style={LABEL}>Additional info</div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.additionalInfo}</p>
            </div>
          )}

          {r.status !== "PENDING" && (
            <p style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
              {r.status === "APPROVED" ? "Approved" : "Rejected"}
              {r.reviewedBy && ` by ${r.reviewedBy}`}
              {r.reviewedAt && ` on ${fmtDate(r.reviewedAt)}`}
              {r.reviewNote && ` — “${r.reviewNote}”`}
              {r.status === "APPROVED" && r.customerId && (
                <>
                  {" · "}
                  <a href={`/customers?customerId=${r.customerId}`} style={{ textDecoration: "underline", fontWeight: 700 }}>Open customer</a>
                </>
              )}
            </p>
          )}

          {r.status === "PENDING" && (
            canReview ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn primary sm" disabled={pending} onClick={approve}>
                  {pending ? "Working…" : "Approve & add customer"}
                </button>
                <button type="button" className="btn ghost sm" disabled={pending} onClick={reject}>Reject</button>
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Only an administrator can approve or reject requests.</p>
            )
          )}
          {error && <p style={{ fontSize: 12.5, color: "var(--danger)" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

export function RequestsPanel({ requests, canReview }: { requests: RequestRow[]; canReview: boolean }) {
  const pending = requests.filter((r) => r.status === "PENDING");
  const reviewed = requests.filter((r) => r.status !== "PENDING");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section>
        <div style={{ ...LABEL, marginBottom: 10 }}>Awaiting review ({pending.length})</div>
        {pending.length === 0 ? (
          <div className="card-soft" style={{ padding: 22, color: "var(--ink-2)", fontSize: 13.5 }}>
            No new requests. Submissions from the public quote form appear here for approval.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map((r) => (
              <RequestCard key={r.id} r={r} canReview={canReview} />
            ))}
          </div>
        )}
      </section>

      {reviewed.length > 0 && (
        <section>
          <div style={{ ...LABEL, marginBottom: 10 }}>Reviewed ({reviewed.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reviewed.map((r) => (
              <RequestCard key={r.id} r={r} canReview={canReview} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
