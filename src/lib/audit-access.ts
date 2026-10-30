import { customers } from "@/lib/repo";
import type { Audit } from "@/lib/repo-types";
import type { SessionUser } from "@/lib/access";

// Auditors (the INSPECTOR role) only work with what the administrator assigned to them:
// the customers assigned to them, and the audits on those customers (or that they started themselves).

export async function assignedCustomerIds(user: SessionUser): Promise<Set<string>> {
  const all = await customers.list();
  return new Set(all.filter((c) => c.assignedAuditorId === user.id).map((c) => c.id));
}

export async function canAccessAudit(user: SessionUser, audit: Pick<Audit, "inspectorId" | "customerId">): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (audit.inspectorId === user.id) return true;
  const customer = await customers.get(audit.customerId);
  return customer?.assignedAuditorId === user.id;
}

// An auditor can edit a report until they submit it to the admin (while it's in progress or completed but not yet submitted).
// Once submitted it is locked; it opens again only when the administrator sends it back for correction.
export function canEditAudit(user: Pick<SessionUser, "role">, audit: Pick<Audit, "draft" | "readyToSubmit">): boolean {
  return user.role === "ADMIN" || audit.draft || audit.readyToSubmit;
}

export const LOCKED_MESSAGE = "This report has been submitted to the admin. It can only be edited if the administrator sends it back for corrections.";
