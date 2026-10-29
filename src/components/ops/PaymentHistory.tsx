"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordCustomerPayment } from "@/lib/actions/ops";
import { unwrap } from "@/lib/actions/result";
import { PAYMENT_METHODS } from "@/lib/payments";
import { money } from "@/lib/ops-options";
import type { PaymentRecord } from "@/lib/repo-types";
import { DetailsDialog } from "./Dialog";
import { PaymentPill } from "./Parts";
import { PaymentsList, ProofPicker } from "./Payments";
import { todayLocal } from "./PaymentSection";

const Label = ({ children }: { children: React.ReactNode }) => <div className="dt-field-label">{children}</div>;

// A customer's payment history, plus (for admins) a form to record the next payment.
// Recording the last of the balance flips the status to "Fully Paid".
export function PaymentHistoryDialog({
  customerId,
  name,
  total,
  paid,
  status,
  payments,
  canRecord,
  onClose,
}: {
  customerId: string;
  name: string;
  total: number | null;
  paid: number;
  status: string;
  payments: PaymentRecord[];
  canRecord: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [totalInput, setTotalInput] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [date, setDate] = useState(todayLocal());
  const [transactionId, setTransactionId] = useState("");
  const [proofs, setProofs] = useState<string[]>([]);

  const entered = Number(totalInput);
  const totalKnown = total ?? (Number.isFinite(entered) && entered > 0 ? entered : null);
  const balance = totalKnown !== null ? Math.max(Math.round((totalKnown - paid) * 100) / 100, 0) : null;
  const fullyPaid = status === "Full Payment" || (balance !== null && balance <= 0 && paid > 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    const value = Number(amount);
    if (totalKnown === null) return setError("Enter the total amount of the deal.");
    if (!Number.isFinite(value) || value <= 0) return setError("Enter the amount received.");
    if (balance !== null && value > balance + 0.004) return setError(`The most you can record is ${money(balance)} (the balance still due).`);
    if (!transactionId.trim()) return setError("Enter the transaction ID.");
    if (proofs.length === 0) return setError("Attach a screenshot or invoice of the payment.");
    startTransition(async () => {
      try {
        const res = unwrap(await recordCustomerPayment(customerId, { amount: value, method, date, transactionId, proofs, ...(total === null ? { totalAmount: totalKnown } : {}) }));
        setDone(res.ok && res.status === "Full Payment" ? "Payment recorded — this customer is now Fully Paid." : "Payment recorded.");
        setAmount("");
        setTransactionId("");
        setProofs([]);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't record the payment.");
      }
    });
  }

  return (
    <DetailsDialog title="Payments" subtitle={name} onClose={onClose}>
      <div className="dtl-grid" style={{ opacity: pending ? 0.6 : 1 }}>
        <div>
          <Label>Total amount of deal</Label>
          <div style={{ fontWeight: 700 }}>{total !== null ? money(total) : "Not set"}</div>
        </div>
        <div>
          <Label>Status</Label>
          <PaymentPill status={status} />
        </div>
        <div>
          <Label>Paid so far</Label>
          <div style={{ fontWeight: 700 }}>{money(paid)}</div>
        </div>
        <div>
          <Label>Balance due</Label>
          <div style={{ fontWeight: 700 }}>{balance !== null ? money(balance) : "—"}</div>
        </div>

        <div className="dtl-wide">
          <Label>Payment history</Label>
          <PaymentsList payments={payments} />
        </div>
      </div>

      {done && <p role="status" style={{ color: "var(--ok)", fontWeight: 700, fontSize: 13.5, marginTop: 14 }}>{done}</p>}

      {fullyPaid ? (
        !done && <p style={{ color: "var(--ok)", fontWeight: 700, fontSize: 13.5, marginTop: 14 }}>Fully paid ✓</p>
      ) : canRecord ? (
        <form onSubmit={submit} style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--rule)" }}>
          <strong style={{ fontSize: 14 }}>Record a payment</strong>
          <div className="dtl-grid" style={{ marginTop: 12 }}>
            {total === null && (
              <div className="dtl-wide">
                <Label>Total amount of deal</Label>
                <div className="dt-money" style={{ maxWidth: 240 }}>
                  <span aria-hidden="true">$</span>
                  <input className="input" inputMode="decimal" value={totalInput} onChange={(e) => setTotalInput(e.target.value)} placeholder="Enter the deal total" />
                </div>
              </div>
            )}
            <div>
              <Label>Amount received{balance !== null ? ` (up to ${money(balance)})` : ""}</Label>
              <div className="dt-money">
                <span aria-hidden="true">$</span>
                <input className="input" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={balance ? String(balance) : "0.00"} />
              </div>
            </div>
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
            <div>
              <Label>Transaction ID</Label>
              <input className="input" required maxLength={120} value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
            </div>
            <div className="dtl-wide">
              <Label>Attach screenshot</Label>
              <ProofPicker value={proofs} onChange={setProofs} />
            </div>
          </div>
          {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 13, marginTop: 12 }}>{error}</p>}
          <div className="dtl-foot" style={{ justifyContent: "flex-end", borderTop: "none", marginTop: 8, paddingTop: 0 }}>
            <button type="submit" className="btn primary sm" disabled={pending}>{pending ? "Saving…" : "Record payment"}</button>
          </div>
        </form>
      ) : (
        <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 14 }}>Only an administrator can record payments.</p>
      )}
    </DetailsDialog>
  );
}
