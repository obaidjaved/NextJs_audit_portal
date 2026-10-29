import type { Audit } from "./repo-types";

// What an admin sees for an audit's review state.
export type ReviewStatus = "Approved" | "Needs Correction" | "Pending approval" | "In progress";

export function reviewStatus(a: Pick<Audit, "draft" | "pendingApproval" | "needsCorrection">): ReviewStatus {
  if (a.draft) return a.needsCorrection ? "Needs Correction" : "In progress";
  if (a.pendingApproval) return "Pending approval";
  return "Approved";
}

// An approved audit is final: its report can be sent to the customer.
export const isApproved = (a: Pick<Audit, "draft" | "pendingApproval">) => !a.draft && !a.pendingApproval;
