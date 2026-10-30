import type { Audit } from "./repo-types";

// What an admin sees for an audit's review state.
export type ReviewStatus = "Approved" | "Needs Correction" | "Pending approval" | "Ready to submit" | "In progress";

export function reviewStatus(a: Pick<Audit, "draft" | "pendingApproval" | "needsCorrection" | "readyToSubmit">): ReviewStatus {
  if (a.draft) return a.needsCorrection ? "Needs Correction" : "In progress";
  // Completed by the auditor but not yet sent to the admin.
  if (a.readyToSubmit) return "Ready to submit";
  if (a.pendingApproval) return "Pending approval";
  return "Approved";
}

// When an admin sends a report back, the instructions are saved as an Activity entry that starts with this.
export const CORRECTION_PREFIX = "Correction requested: ";
export const MAX_CORRECTION_NOTE = 800;

// The most recent set of instructions, from an audit's activity (oldest first or newest first, either works).
export function latestCorrectionNote(events: { message: string; createdAt: Date }[]): string | null {
  const notes = events
    .filter((e) => e.message.startsWith(CORRECTION_PREFIX))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const last = notes[notes.length - 1];
  return last ? last.message.slice(CORRECTION_PREFIX.length) : null;
}

// An approved audit is final: its report can be sent to the customer.
export const isApproved = (a: Pick<Audit, "draft" | "pendingApproval" | "readyToSubmit">) => !a.draft && !a.pendingApproval && !a.readyToSubmit;
