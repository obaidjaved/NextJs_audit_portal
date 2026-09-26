import type { ResponseObject } from "@/lib/scoring";
import { actions, audits } from "@/lib/wp/repo";
import { findingsNeedingAction } from "./corrective-pure";

const DUE_DAYS: Record<string, number> = { CRITICAL: 7, HIGH: 14, MEDIUM: 30, LOW: 60 };

function dateOnlyPlusDays(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Idempotent: one auto-raised action per (audit, finding label).
export async function syncActionsFromAudit(audit: { id: string; customerId: string; title: string }, responses: ResponseObject[]) {
  const findings = findingsNeedingAction(responses);
  if (findings.length === 0) return 0;
  const existing = await actions.list({ auditId: audit.id });
  const have = new Set(existing.map((e) => e.findingLabel));
  const fresh = findings.filter((f) => !have.has(f.label));
  if (fresh.length === 0) return 0;
  await actions.createMany(
    fresh.map((f) => ({
      title: `Resolve: ${f.label}`,
      description: `${f.detail} on ${audit.title}.`,
      priority: f.priority,
      findingLabel: f.label,
      auditId: audit.id,
      customerId: audit.customerId,
      dueDate: dateOnlyPlusDays(DUE_DAYS[f.priority]),
    })),
  );
  return fresh.length;
}

// The acting user is taken from the signed-in session by the API client.
export async function logEvent(auditId: string, _userId: string | undefined, message: string) {
  void _userId;
  await audits.addEvent(auditId, message);
}
