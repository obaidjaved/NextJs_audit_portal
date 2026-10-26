import { z } from "zod";
import type { PaymentRecord } from "./repo-types";

// A proof file is an https link (Blob storage), an uploaded-file path (/uploads/…) or inline image/PDF data.
export const isProofRef = (s: string) => /^(https:\/\/|\/uploads\/|data:image\/|data:application\/pdf)/.test(s);

export const PAYMENT_METHODS = ["PayPal", "Bank Transfer"] as const;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the payment date");

// The details entered in the payment popups (the amount is decided by each flow).
export const paymentDetailsSchema = z.object({
  method: z.enum(PAYMENT_METHODS, { message: "Choose PayPal or Bank Transfer" }),
  date,
  transactionId: z.string().trim().min(1, "Enter the transaction ID").max(120),
  proofs: z.array(z.string().max(3_000_000).refine(isProofRef, "Not a valid file")).min(1, "Attach a screenshot or invoice").max(5, "Up to 5 files"),
});

export type PaymentDetails = z.infer<typeof paymentDetailsSchema>;

export function makePayment(amount: number, details: PaymentDetails): PaymentRecord {
  return {
    id: crypto.randomUUID(),
    amount: Math.round(amount * 100) / 100,
    method: details.method,
    date: details.date,
    transactionId: details.transactionId,
    proofs: details.proofs,
    recordedAt: new Date().toISOString(),
  };
}

export function sumPayments(payments: PaymentRecord[]): number {
  return Math.round(payments.reduce((n, p) => n + p.amount, 0) * 100) / 100;
}

export function allProofs(payments: PaymentRecord[]): string[] {
  return [...new Set(payments.flatMap((p) => p.proofs))];
}
