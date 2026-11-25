"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { uploadFile } from "@/lib/upload";
import { unwrap } from "@/lib/actions/result";
import { money } from "@/lib/ops-options";
import type { PaymentRecord } from "@/lib/repo-types";
import { DetailsDialog } from "./Dialog";
import { openProof } from "./ProofManager";
import { fmtDate } from "./Parts";

const isPdf = (u: string) => u.startsWith("data:application/pdf") || /\.pdf(\?|#|$)/i.test(u);

export function ProofThumbs({ proofs, onRemove }: { proofs: string[]; onRemove?: (i: number) => void }) {
  if (proofs.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {proofs.map((p, i) => (
        <div key={i} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => openProof(p)}
            aria-label={`Open file ${i + 1}`}
            style={{ width: 64, height: 64, borderRadius: 10, border: "1px solid var(--rule)", background: "var(--card-soft)", cursor: "pointer", overflow: "hidden", padding: 0, fontWeight: 800, fontSize: 11, color: "var(--ink-2)" }}
          >
            {isPdf(p) ? (
              "PDF"
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </button>
          {onRemove && (
            <button
              type="button"
              aria-label={`Remove file ${i + 1}`}
              onClick={() => onRemove(i)}
              style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--pill)", color: "var(--pill-ink)", border: "none", cursor: "pointer" }}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// "Attach screenshot": uploads one or more files and hands the list back to the form.
export function ProofPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      onChange([...value, await uploadFile(file)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <ProofThumbs proofs={value} onRemove={(i) => onChange(value.filter((_, j) => j !== i))} />
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: "none" }}
          onChange={(e) => {
            add(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button type="button" className="btn ghost sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? "Uploading…" : value.length ? "+ Add another file" : "+ Attach screenshot / invoice"}
        </button>
      </div>
      {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5 }}>{error}</p>}
    </div>
  );
}

// Every payment received, newest last — shown in the lead / customer details.
export function PaymentsList({ payments }: { payments: PaymentRecord[] }) {
  if (payments.length === 0) return <p style={{ color: "var(--ink-2)", fontSize: 13 }}>No payments recorded yet.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {payments.map((p) => (
        <div key={p.id} className="card-soft" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 13 }}>
            <strong>{money(p.amount)}</strong>
            <span>{p.method}</span>
            <span>{fmtDate(p.date)}</span>
            {p.transactionId && <span style={{ color: "var(--ink-2)" }}>ID {p.transactionId}</span>}
          </div>
          <ProofThumbs proofs={p.proofs} />
        </div>
      ))}
    </div>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => <div className="dt-field-label">{children}</div>;

// Converting a lead into a customer. No payment is asked for here: we give the service first and ask for payment afterwards
// (recorded from the customer's Payments).
export function ConvertDialog({
  title,
  defaultTotal,
  onClose,
  onSubmit,
}: {
  title: string;
  defaultTotal: number | null;
  onClose: () => void;
  onSubmit: (data: { totalAmount: number | null }) => Promise<unknown>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(defaultTotal !== null ? String(defaultTotal) : "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const raw = total.trim();
    let totalAmount: number | null = null;
    if (raw !== "") {
      totalAmount = Number(raw);
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) return setError("Enter a valid amount, or leave it empty.");
    }
    startTransition(async () => {
      try {
        unwrap(await onSubmit({ totalAmount }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <DetailsDialog title={title} subtitle="This turns the lead into a customer. Payment is recorded later, once the service has been given." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="dtl-grid">
          <div className="dtl-wide">
            <Label>Total amount of deal (optional)</Label>
            <div className="dt-money" style={{ maxWidth: 240 }}>
              <span aria-hidden="true">$</span>
              <input className="input" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Agreed amount, if known" />
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6 }}>You can add or change it later, from the customer.</div>
          </div>
        </div>

        {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</p>}

        <div className="dtl-foot" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn ghost sm" onClick={onClose} disabled={pending}>Cancel</button>
          <button type="submit" className="btn primary sm" disabled={pending}>{pending ? "Saving…" : "Convert to customer"}</button>
        </div>
      </form>
    </DetailsDialog>
  );
}

// Marking a customer's job completed: the service has been given. Payment is asked for after this, so it is not needed here.
export function CompleteDialog({
  title,
  auditor,
  assigned,
  hasReport,
  total,
  paid,
  onClose,
  onSubmit,
}: {
  title: string;
  auditor: string | null;
  assigned: boolean; // an auditor is assigned to the query
  hasReport: boolean; // a completed audit report exists for this customer
  total: number | null;
  paid: number;
  onClose: () => void;
  onSubmit: () => Promise<unknown>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await onSubmit());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const due = total !== null ? Math.max(Math.round((total - paid) * 100) / 100, 0) : null;

  return (
    <DetailsDialog title={title} subtitle="Mark this job as done. Next you send the report and ask the customer for payment." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="dtl-grid">
          <div>
            <Label>Auditor</Label>
            {assigned ? (
              <div style={{ fontWeight: 700 }}>{auditor}</div>
            ) : (
              <div style={{ fontWeight: 700, color: "var(--danger)" }}>Not assigned — assign an auditor first</div>
            )}
          </div>
          <div>
            <Label>Total amount of deal</Label>
            <div style={{ fontWeight: 700 }}>{total !== null ? money(total) : "Not set"}</div>
          </div>
          <div>
            <Label>Paid so far</Label>
            <div style={{ fontWeight: 700 }}>{money(paid)}</div>
          </div>
          <div>
            <Label>Still to collect</Label>
            <div style={{ fontWeight: 700 }}>{due !== null ? money(due) : "—"}</div>
          </div>
        </div>

        {!hasReport && (
          <p style={{ fontSize: 12.5, color: "var(--warn)", marginTop: 12 }}>
            Note: there is no completed audit report for this customer yet. You can still mark the job completed.
          </p>
        )}

        {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</p>}

        <div className="dtl-foot" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn ghost sm" onClick={onClose} disabled={pending}>Cancel</button>
          <button type="submit" className="btn primary sm" disabled={pending || !assigned}>{pending ? "Saving…" : "Mark completed"}</button>
        </div>
      </form>
    </DetailsDialog>
  );
}

// A timed pop-up after a job is completed: send the report, then ask the customer for payment.
export function ReminderToast({ onClose, onGo, onPay, seconds = 20 }: { onClose: () => void; onGo: () => void; onPay?: () => void; seconds?: number }) {
  useEffect(() => {
    const t = setTimeout(onClose, seconds * 1000);
    return () => clearTimeout(t);
  }, [onClose, seconds]);
  return (
    <div className="reminder" role="status" aria-live="polite">
      <div style={{ fontWeight: 800, fontSize: 14.5 }}>Job completed ✓</div>
      <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "4px 0 10px", lineHeight: 1.5 }}>
        Next: send the audit report (PDF) to the customer, then ask them for payment.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn primary sm" onClick={onGo}>Send the report</button>
        {onPay && <button type="button" className="btn ghost sm" onClick={onPay}>Record payment</button>}
        <button type="button" className="btn ghost sm" onClick={onClose}>Dismiss</button>
      </div>
      <div className="reminder-bar" style={{ animationDuration: `${seconds}s` }} />
    </div>
  );
}
