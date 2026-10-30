import type { Audit, Customer } from "./repo-types";
import { isApproved, reviewStatus, type ReviewStatus } from "./audit-review";
import { mergeValuesFor, type MergeValues } from "./email-merge";
import { serviceTypesOf } from "./ops-options";

// One line on the Audits tab: either an audit that exists, or a customer's query that has no audit yet
// (so an auditor can still be assigned to it). The Console's counts use the same lines, so the numbers match the list.
export interface AuditRow {
  key: string;
  auditId: string | null;
  customerId: string;
  company: string;
  client: string; // the contact person
  code: string | null; // audit number
  address: string;
  assignedAt: string | null; // date of assignment
  doneAt: string | null; // date of service given (when the audit was done)
  neededBy: string | null; // customer's "service needed by" date
  auditorId: string | null;
  auditorName: string | null;
  services: string[];
  review: ReviewStatus | null; // null = no audit yet
  submitted: boolean; // a report exists to view
  editable: boolean; // the auditor can still edit it: in progress, completed but not submitted, or sent back
  canSubmit: boolean; // completed, waiting for the auditor to submit it to the admin
  correctionNote: string; // the admin's instructions while it is sent back
  approved: boolean; // the report can be sent to the customer
  customerCompleted: boolean;
  email: string | null;
  merge: MergeValues;
}

export type AuditView = "all" | "unassigned" | "upcoming" | "completed" | "due" | "today";
export const AUDIT_VIEWS: AuditView[] = ["all", "unassigned", "upcoming", "completed", "due", "today"];

// todayKey = "YYYY-MM-DD".
export function matchesView(r: AuditRow, view: AuditView, todayKey: string): boolean {
  if (view === "unassigned") return !r.auditorId && !r.customerCompleted;
  if (view === "upcoming") return !!r.auditorId && !r.customerCompleted && !!r.neededBy && r.neededBy >= todayKey;
  if (view === "completed") return r.approved;
  // "Due" is what still needs the auditor: a report waiting for the admin's review is no longer their task.
  if (view === "due") return !r.approved && !r.customerCompleted && r.review !== "Pending approval";
  if (view === "today") return !r.approved && !r.customerCompleted && r.review !== "Pending approval" && r.neededBy === todayKey;
  return true;
}

const place = (c?: { site: string | null; city: string | null; state: string | null }) =>
  [c?.site, [c?.city, c?.state].filter(Boolean).join(", ")].filter(Boolean).join(", ");
const clientOf = (contact: string | null | undefined) => contact?.split(",")[0]?.trim() ?? "";

// What one auditor sees: the customers assigned to them, and the audits on those (or that they started themselves).
export function buildAuditorRows(audits: Audit[], customers: Customer[], userId: string): AuditRow[] {
  const mine = customers.filter((c) => c.assignedAuditorId === userId);
  const mineIds = new Set(mine.map((c) => c.id));
  return buildAuditRows(
    audits.filter((a) => a.inspectorId === userId || mineIds.has(a.customerId)),
    mine,
  );
}

export function buildAuditRows(audits: Audit[], customers: Customer[]): AuditRow[] {
  const customerById = new Map(customers.map((c) => [c.id, c]));

  // One line per audit...
  const auditRows: AuditRow[] = audits.map((a) => {
    const c = customerById.get(a.customerId);
    const services = c?.services ?? [];
    const auditorName = c?.assignedAuditorName ?? a.inspector?.name ?? null;
    return {
      key: `a-${a.id}`,
      auditId: a.id,
      customerId: a.customerId,
      company: a.customer.name,
      client: clientOf(c?.contact ?? a.customer.contact),
      code: a.docNumber,
      address: place(c ?? a.customer),
      assignedAt: c?.assignedAt?.toISOString() ?? null,
      doneAt: a.draft && !a.needsCorrection ? null : a.date.toISOString(),
      neededBy: c?.serviceDate ?? null,
      auditorId: c?.assignedAuditorId ?? null,
      auditorName,
      services,
      review: reviewStatus(a),
      submitted: !a.draft || a.needsCorrection,
      editable: a.draft || a.readyToSubmit,
      canSubmit: a.readyToSubmit,
      correctionNote: a.needsCorrection ? a.correctionNote ?? "" : "",
      approved: isApproved(a),
      customerCompleted: c?.progressStatus === "Completed",
      email: c?.email ?? a.customer.email,
      merge: mergeValuesFor(a, { service: serviceTypesOf(services).join(", "), auditorName: auditorName ?? "" }),
    };
  });

  // ...plus a line for every open customer query that has no audit yet.
  const withAudit = new Set(audits.map((a) => a.customerId));
  const queryRows: AuditRow[] = customers
    .filter((c) => !withAudit.has(c.id) && c.progressStatus !== "Completed")
    .map((c) => ({
      key: `c-${c.id}`,
      auditId: null,
      customerId: c.id,
      company: c.name,
      client: clientOf(c.contact),
      code: null,
      address: place(c),
      assignedAt: c.assignedAt?.toISOString() ?? null,
      doneAt: null,
      neededBy: c.serviceDate,
      auditorId: c.assignedAuditorId,
      auditorName: c.assignedAuditorName,
      services: c.services,
      review: null,
      submitted: false,
      editable: false,
      canSubmit: false,
      correctionNote: "",
      approved: false,
      customerCompleted: false,
      email: c.email,
      merge: {},
    }));

  // Needs-assigning first (that's the to-do list), then the rest as they came.
  return [...queryRows, ...auditRows].sort((a, b) => Number(!!a.auditorId) - Number(!!b.auditorId));
}
