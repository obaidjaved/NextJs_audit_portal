import { SERVICE_GROUPS } from "./quote-options";

// Drop-down values used by the Leads and Customers dashboards.
export const LEAD_STATUSES = ["New", "Contacted", "In progress", "Cold", "Not Interested", "Converted"] as const;
export const PAYMENT_STATUSES = ["None", "Partial", "Full Payment"] as const;
export const PROGRESS_STATUSES = ["In progress", "Rescheduled", "Completed"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

const GROUP_OF = new Map(SERVICE_GROUPS.flatMap((g) => g.options.map((o) => [o, g.group] as const)));

// "Service Type" is the group a chosen sub-service belongs to, e.g.
// "Arc Flash Compliance" -> "Field Audits". Anything unrecognised is skipped.
export function serviceTypesOf(services: string[]): string[] {
  return [...new Set(services.map((s) => GROUP_OF.get(s)).filter((g): g is string => Boolean(g)))];
}

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}
