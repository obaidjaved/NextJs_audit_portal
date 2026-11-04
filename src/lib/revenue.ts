import type { Customer } from "./repo-types";

// Money figures for the admin Console, worked out from the payments recorded on each customer.

export type Period = "all" | "1y" | "6m" | "3m" | "month";

export const PERIOD_LABEL: Record<Period, string> = {
  all: "All time",
  "1y": "1 year",
  "6m": "6 months",
  "3m": "3 months",
  month: "This month",
};

// One payment received (date is null for money recorded on a customer without a payment history, so it only counts toward "all time").
export interface PaymentLine {
  id: string;
  date: string | null; // YYYY-MM-DD
  customerId: string;
  customer: string;
  amount: number;
  method: string | null;
  transactionId: string | null;
}

// What a customer still owes on their deal.
export interface BalanceLine {
  customerId: string;
  customer: string;
  started: string; // YYYY-MM-DD, when the customer was added
  total: number;
  paid: number;
  balance: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const dayKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

// The first day a period covers (null = no limit). todayKey is YYYY-MM-DD in the business's time zone.
// "This month" starts on the 1st; the others look back that many months from today.
export function periodStart(period: Period, todayKey: string): string | null {
  if (period === "all") return null;
  const y = +todayKey.slice(0, 4);
  const m = +todayKey.slice(5, 7) - 1;
  const d = +todayKey.slice(8, 10);
  if (period === "month") return dayKey(new Date(Date.UTC(y, m, 1)));
  const months = period === "1y" ? 12 : period === "6m" ? 6 : 3;
  const start = new Date(Date.UTC(y, m - months, 1));
  // Same day of the month, or the month's last day if it is shorter (31 Aug -> 28/29 Feb).
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(d, lastDay));
  return dayKey(start);
}

export function buildPaymentLines(customers: Customer[]): PaymentLine[] {
  const lines: PaymentLine[] = [];
  for (const c of customers) {
    if (c.payments.length > 0) {
      for (const p of c.payments) {
        lines.push({ id: p.id, date: p.date, customerId: c.id, customer: c.name, amount: p.amount, method: p.method, transactionId: p.transactionId });
      }
    } else if (c.amountPaid > 0) {
      lines.push({ id: `paid-${c.id}`, date: null, customerId: c.id, customer: c.name, amount: c.amountPaid, method: null, transactionId: null });
    }
  }
  return lines.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function buildBalanceLines(customers: Customer[], payments: PaymentLine[]): BalanceLine[] {
  const paidBy = new Map<string, number>();
  for (const p of payments) paidBy.set(p.customerId, (paidBy.get(p.customerId) ?? 0) + p.amount);
  const lines: BalanceLine[] = [];
  for (const c of customers) {
    const total = c.projectValue ?? 0;
    const paid = round2(paidBy.get(c.id) ?? 0);
    // Only deals with a known total can have a balance.
    if (total > 0 && total > paid) lines.push({ customerId: c.id, customer: c.name, started: dayKey(c.createdAt), total, paid, balance: round2(total - paid) });
  }
  return lines.sort((a, b) => b.balance - a.balance);
}

export function paymentsIn(lines: PaymentLine[], period: Period, todayKey: string): PaymentLine[] {
  const start = periodStart(period, todayKey);
  if (!start) return lines;
  return lines.filter((l) => l.date !== null && l.date >= start && l.date <= todayKey);
}

export function balancesIn(lines: BalanceLine[], period: Period, todayKey: string): BalanceLine[] {
  const start = periodStart(period, todayKey);
  if (!start) return lines;
  return lines.filter((l) => l.started >= start && l.started <= todayKey);
}

export const sumOf = (rows: { amount: number }[]) => round2(rows.reduce((n, r) => n + r.amount, 0));
export const sumBalance = (rows: BalanceLine[]) => round2(rows.reduce((n, r) => n + r.balance, 0));

export function money(n: number): string {
  const whole = Number.isInteger(n);
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}
