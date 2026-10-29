"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { uploadFile } from "@/lib/upload";
import { unwrap } from "@/lib/actions/result";
import { PAYMENT_METHODS } from "@/lib/payments";
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

const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const Label = ({ children }: { children: React.ReactNode }) => <div className="dt-field-label">{children}</div>;

// The popup that asks for payment details. Two uses:
//  - "convert": a lead is being converted; the admin enters the deal total and what was paid.
//  - "complete": a customer's query is being completed; the deal details are shown, and if it isn't fully paid the final instalment is recorded.
export type PaymentDialogProps =
  | {
      mode: "convert";
      title: string;
      defaultTotal: number | null;
      onClose: () => void;
      onSubmit: (data: { totalAmount: number; status: "Full Payment" | "Partial"; amountPaid: number; method: string; date: string; transactionId: string; proofs: string[] }) => Promise<unknown>;
    }
  | {
      mode: "complete";
      title: string;
      auditor: string | null;
      total: number | null;
      paid: number;
      paymentStatus: string;
      assigned: boolean; // an auditor is assigned to the query
      hasReport: boolean; // a completed audit report exists for this customer
      hasPayments: boolean; // at least one payment has been recorded here
      onClose: () => void;
      onSubmit: (data: { method?: string; date?: string; transactionId?: string; proofs?: string[]; totalAmount?: number; alreadyPaid?: boolean } | undefined) => Promise<unknown>;
    };

export function PaymentDialog(props: PaymentDialogProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const convert = props.mode === "convert";
  const [total, setTotal] = useState(convert && props.defaultTotal !== null ? String(props.defaultTotal) : "");
  const [status, setStatus] = useState<"Full Payment" | "Partial">("Full Payment");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [date, setDate] = useState(todayLocal());
  const [transactionId, setTransactionId] = useState("");
  const [proofs, setProofs] = useState<string[]>([]);
  const [totalInput, setTotalInput] = useState("");
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  // Fully paid means the amount paid is the whole total.
  const paidShown = status === "Full Payment" ? total : paid;

  // Complete mode: the deal total is on file, or the admin types it in (customers added by hand have none yet).
  const needsPayment = convert || props.paymentStatus !== "Full Payment";
  const entered = Number(totalInput);
  const totalKnown = !convert ? (props.total ?? (Number.isFinite(entered) && entered > 0 ? entered : null)) : null;
  const balance = !convert && totalKnown !== null ? Math.max(Math.round((totalKnown - props.paid) * 100) / 100, 0) : null;
  // Nothing was ever recorded for this customer: the admin may confirm it was all paid before payments were tracked.
  const canSkipPayment = !convert && needsPayment && !props.hasPayments;
  const paying = !convert && needsPayment && !alreadyPaid && (balance ?? 1) > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (props.mode === "convert") {
          const totalAmount = Number(total);
          if (!Number.isFinite(totalAmount) || totalAmount <= 0) return setError("Enter the total amount of the deal.");
          const amountPaid = status === "Full Payment" ? totalAmount : Number(paid);
          if (!Number.isFinite(amountPaid) || amountPaid <= 0) return setError("Enter the amount paid.");
          if (status === "Partial" && amountPaid >= totalAmount) return setError("A partial payment must be less than the total. Choose “Fully paid” instead.");
          if (!transactionId.trim()) return setError("Enter the transaction ID.");
          if (proofs.length === 0) return setError("Attach a screenshot or invoice of the payment.");
          unwrap(await props.onSubmit({ totalAmount, status, amountPaid, method, date, transactionId, proofs }));
        } else {
          if (!props.assigned) return setError("Assign an auditor to this query before completing it.");
          if (needsPayment && totalKnown === null) return setError("Enter the total amount of the deal.");
          if (paying && !transactionId.trim()) return setError("Enter the transaction ID.");
          if (paying && proofs.length === 0) return setError("Attach a screenshot or invoice of the payment.");
          unwrap(
            await props.onSubmit(
              needsPayment
                ? {
                    ...(paying ? { method, date, transactionId, proofs } : {}),
                    ...(props.total === null && totalKnown !== null ? { totalAmount: totalKnown } : {}),
                    ...(alreadyPaid ? { alreadyPaid: true } : {}),
                  }
                : undefined,
            ),
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const paymentFields = (
    <>
      <div>
        <Label>Paid via</Label>
        <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Payment date</Label>
        <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="dtl-wide">
        <Label>Transaction ID</Label>
        <input className="input" required maxLength={120} value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. PayPal or bank reference" />
      </div>
      <div className="dtl-wide">
        <Label>Attach screenshot</Label>
        <ProofPicker value={proofs} onChange={setProofs} />
      </div>
    </>
  );

  return (
    <DetailsDialog title={props.title} subtitle={convert ? "Enter the payment received to convert this lead into a customer." : "Review the deal before marking this query completed."} onClose={props.onClose}>
      <form onSubmit={submit}>
        <div className="dtl-grid">
          {props.mode === "convert" ? (
            <>
              <div>
                <Label>Total amount of deal</Label>
                <div className="dt-money">
                  <span aria-hidden="true">$</span>
                  <input className="input" inputMode="decimal" required value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div>
                <Label>Payment</Label>
                <div style={{ display: "flex", gap: 14, minHeight: 42, alignItems: "center", fontSize: 13.5 }}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="radio" name="pay-status" checked={status === "Full Payment"} onChange={() => setStatus("Full Payment")} /> Fully paid
                  </label>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="radio" name="pay-status" checked={status === "Partial"} onChange={() => setStatus("Partial")} /> Partial
                  </label>
                </div>
              </div>
              <div className="dtl-wide">
                <Label>Amount paid</Label>
                <div className="dt-money" style={{ maxWidth: 240 }}>
                  <span aria-hidden="true">$</span>
                  <input className="input" inputMode="decimal" required disabled={status === "Full Payment"} value={paidShown} onChange={(e) => setPaid(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              {paymentFields}
            </>
          ) : (
            <>
              <div>
                <Label>Auditor</Label>
                {props.assigned ? (
                  <div style={{ fontWeight: 700 }}>{props.auditor}</div>
                ) : (
                  <div style={{ fontWeight: 700, color: "var(--danger)" }}>Not assigned — assign an auditor first</div>
                )}
              </div>
              <div>
                <Label>Total amount of deal</Label>
                {props.total !== null ? (
                  <div style={{ fontWeight: 700 }}>{money(props.total)}</div>
                ) : (
                  <div className="dt-money">
                    <span aria-hidden="true">$</span>
                    <input className="input" inputMode="decimal" required value={totalInput} onChange={(e) => setTotalInput(e.target.value)} placeholder="Enter the deal total" />
                  </div>
                )}
              </div>
              <div>
                <Label>Payment status</Label>
                <div style={{ fontWeight: 700 }}>{props.paymentStatus === "Full Payment" ? "Fully paid" : props.paymentStatus === "Partial" ? "Partial" : "Not paid"}</div>
              </div>
              <div>
                <Label>Paid so far</Label>
                <div style={{ fontWeight: 700 }}>{money(props.paid)}</div>
              </div>
              {needsPayment && (
                <>
                  <div className="dtl-wide" style={{ borderTop: "1px solid var(--rule)", paddingTop: 14 }}>
                    <strong style={{ fontSize: 14 }}>Final instalment</strong>
                    <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>
                      {balance !== null ? <>Balance due: <strong style={{ color: "var(--ink)" }}>{money(balance)}</strong></> : "Enter the total amount of the deal above."}
                    </div>
                  </div>
                  {canSkipPayment && (
                    <label className="dtl-wide" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                      <input type="checkbox" checked={alreadyPaid} onChange={(e) => setAlreadyPaid(e.target.checked)} style={{ width: 18, height: 18 }} />
                      This was already paid in full earlier — nothing new to record
                    </label>
                  )}
                  {paying && balance !== null && paymentFields}
                </>
              )}
            </>
          )}
        </div>

        {!convert && !props.hasReport && (
          <p style={{ fontSize: 12.5, color: "var(--warn)", marginTop: 12 }}>
            Note: there is no completed audit report for this customer yet. You can still mark the query completed.
          </p>
        )}

        {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</p>}

        <div className="dtl-foot" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn ghost sm" onClick={props.onClose} disabled={pending}>Cancel</button>
          <button type="submit" className="btn primary sm" disabled={pending || (!convert && !props.assigned)}>
            {pending ? "Saving…" : convert ? "Convert to customer" : "Mark completed"}
          </button>
        </div>
      </form>
    </DetailsDialog>
  );
}

// A timed pop-up: reminds the admin the job is done and the report still has to go out.
export function ReminderToast({ onClose, onGo, seconds = 15 }: { onClose: () => void; onGo: () => void; seconds?: number }) {
  useEffect(() => {
    const t = setTimeout(onClose, seconds * 1000);
    return () => clearTimeout(t);
  }, [onClose, seconds]);
  return (
    <div className="reminder" role="status" aria-live="polite">
      <div style={{ fontWeight: 800, fontSize: 14.5 }}>Payment and audit are both done ✓</div>
      <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "4px 0 10px", lineHeight: 1.5 }}>
        Don’t forget to send the audit report (PDF) to the customer.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn primary sm" onClick={onGo}>Send the report</button>
        <button type="button" className="btn ghost sm" onClick={onClose}>Dismiss</button>
      </div>
      <div className="reminder-bar" style={{ animationDuration: `${seconds}s` }} />
    </div>
  );
}
