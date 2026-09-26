type ActionPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
import type { ResponseObject } from "./scoring";

export interface Finding {
  label: string;
  priority: ActionPriority;
  detail: string;
}

// Failed and marginal answers that warrant a corrective action.
export function findingsNeedingAction(responses: ResponseObject[]): Finding[] {
  const out: Finding[] = [];
  for (const r of responses) {
    if (r.type === "status" && r.value === "fail") out.push({ label: r.label, priority: "HIGH", detail: "Failed inspection item" });
    else if (r.type === "status" && r.value === "marginal") out.push({ label: r.label, priority: "MEDIUM", detail: "Marginal inspection item" });
    else if (r.type === "choice" && r.option?.fail) out.push({ label: r.label, priority: "HIGH", detail: `Answered "${r.option.label}"` });
  }
  return out;
}
