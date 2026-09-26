import type { ChoiceOption } from "./field-types";

export type ResponseObject =
  | { label: string; type: "status"; value: "pass" | "marginal" | "fail" }
  | { label: string; type: "choice"; option: ChoiceOption | null }
  | { label: string; type: "checkbox"; value: boolean }
  | { label: string; type: "photo"; value: string | null; caption: string }
  | { label: string; type: "annotation"; value: string | null; caption: string }
  | { label: string; type: "signature"; value: string | null }
  | { label: string; type: "slider"; value: string }
  | { label: string; type: "number"; value: string }
  | { label: string; type: "date"; value: string }
  | { label: string; type: "location"; value: string; coords: { lat: number; lng: number; accuracy: number } | null }
  | { label: string; type: "text"; value: string };

// Average of scored responses (status/choice with a numeric score). Matches
// design-3.html: unscored response types don't participate in the score.
export function computeScore(responses: ResponseObject[]): number | null {
  const scored: number[] = [];
  for (const r of responses) {
    if (r.type === "status") {
      scored.push(r.value === "pass" ? 100 : r.value === "marginal" ? 60 : 0);
    } else if (r.type === "choice" && r.option && typeof r.option.score === "number") {
      scored.push(r.option.score);
    }
  }
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
}

export function computeCriticalFail(responses: ResponseObject[]): boolean {
  return responses.some((r) => {
    if (r.type === "status") return r.value === "fail";
    if (r.type === "choice") return !!r.option?.fail;
    return false;
  });
}

export function responseHasValue(response: ResponseObject | null): boolean {
  if (!response) return false;
  switch (response.type) {
    case "status":
      return Boolean(response.value);
    case "choice":
      return response.option !== null;
    case "checkbox":
      return true;
    case "photo":
    case "annotation":
      return Boolean(response.value);
    case "signature":
      return Boolean(response.value);
    case "slider":
      return true;
    case "number":
    case "date":
    case "text":
      return response.value.trim().length > 0;
    case "location":
      return response.value.trim().length > 0;
    default:
      return false;
  }
}

export type AuditStatus = "In Progress" | "Pending Approval" | "Flagged" | "Cleared" | "Marginal";

export function auditStatus(a: {
  draft: boolean;
  pendingApproval: boolean;
  criticalFail: boolean;
  score: number | null;
}): AuditStatus {
  if (a.draft) return "In Progress";
  if (a.pendingApproval) return "Pending Approval";
  if (a.criticalFail) return "Flagged";
  if (a.score !== null && a.score >= 90) return "Cleared";
  if (a.score !== null && a.score >= 70) return "Marginal";
  return "Flagged";
}
