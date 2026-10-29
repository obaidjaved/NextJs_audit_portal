"use client";

import { PAYMENT_METHODS } from "@/lib/payments";
import { ProofPicker } from "./Payments";

// The payment received when a customer is added: deal total, fully/partial, amount, method, date, transaction id, screenshot.
export interface PaymentFormState {
  total: string;
  status: "Full Payment" | "Partial";
  paid: string;
  method: string;
  date: string;
  transactionId: string;
  proofs: string[];
}

export const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const emptyPayment = (): PaymentFormState => ({ total: "", status: "Full Payment", paid: "", method: PAYMENT_METHODS[0], date: todayLocal(), transactionId: "", proofs: [] });

const Label = ({ children }: { children: React.ReactNode }) => <div className="dt-field-label">{children}</div>;

// Returns an error message, or null when the payment details are complete.
export function checkPayment(p: PaymentFormState): string | null {
  const total = Number(p.total);
  if (!Number.isFinite(total) || total <= 0) return "Enter the total amount of the deal.";
  const paid = p.status === "Full Payment" ? total : Number(p.paid);
  if (!Number.isFinite(paid) || paid <= 0) return "Enter the amount paid.";
  if (p.status === "Partial" && paid >= total) return "A partial payment must be less than the total. Choose “Fully paid” instead.";
  if (!p.transactionId.trim()) return "Enter the transaction ID.";
  if (p.proofs.length === 0) return "Attach a screenshot or invoice of the payment.";
  return null;
}

export function paymentPayload(p: PaymentFormState) {
  const totalAmount = Number(p.total);
  return {
    totalAmount,
    status: p.status,
    amountPaid: p.status === "Full Payment" ? totalAmount : Number(p.paid),
    method: p.method,
    date: p.date,
    transactionId: p.transactionId,
    proofs: p.proofs,
  };
}

export function PaymentSection({ value, onChange }: { value: PaymentFormState; onChange: (patch: Partial<PaymentFormState>) => void }) {
  return (
    <div className="dtl-grid">
      <div>
        <Label>Total amount of deal</Label>
        <div className="dt-money">
          <span aria-hidden="true">$</span>
          <input className="input" inputMode="decimal" required value={value.total} onChange={(e) => onChange({ total: e.target.value })} placeholder="0.00" />
        </div>
      </div>
      <div>
        <Label>Payment</Label>
        <div style={{ display: "flex", gap: 14, minHeight: 42, alignItems: "center", fontSize: 13.5 }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="radio" name="new-cust-pay" checked={value.status === "Full Payment"} onChange={() => onChange({ status: "Full Payment" })} /> Fully paid
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="radio" name="new-cust-pay" checked={value.status === "Partial"} onChange={() => onChange({ status: "Partial" })} /> Partial
          </label>
        </div>
      </div>
      <div className="dtl-wide">
        <Label>Amount paid</Label>
        <div className="dt-money" style={{ maxWidth: 240 }}>
          <span aria-hidden="true">$</span>
          <input
            className="input"
            inputMode="decimal"
            required
            disabled={value.status === "Full Payment"}
            value={value.status === "Full Payment" ? value.total : value.paid}
            onChange={(e) => onChange({ paid: e.target.value })}
            placeholder="0.00"
          />
        </div>
      </div>
      <div>
        <Label>Paid via</Label>
        <select className="select" value={value.method} onChange={(e) => onChange({ method: e.target.value })}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Payment date</Label>
        <input className="input" type="date" required value={value.date} onChange={(e) => onChange({ date: e.target.value })} />
      </div>
      <div className="dtl-wide">
        <Label>Transaction ID</Label>
        <input className="input" required maxLength={120} value={value.transactionId} onChange={(e) => onChange({ transactionId: e.target.value })} placeholder="e.g. PayPal or bank reference" />
      </div>
      <div className="dtl-wide">
        <Label>Attach screenshot</Label>
        <ProofPicker value={value.proofs} onChange={(proofs) => onChange({ proofs })} />
      </div>
    </div>
  );
}
