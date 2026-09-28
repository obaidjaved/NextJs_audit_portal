"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/access";
import { actions as actionsRepo, audits } from "@/lib/repo";
import { correctiveActionSchema } from "@/lib/validation/corrective";
import { parseOrThrow } from "@/lib/validation/parse";
import { logEvent } from "@/lib/corrective";

function refresh(auditId?: string | null) {
  revalidatePath("/actions");
  revalidatePath("/");
  if (auditId) revalidatePath(`/audits/${auditId}`);
}

export async function createCorrectiveAction(input: unknown) {
  const user = await requireStaff();
  const data = parseOrThrow(correctiveActionSchema, input);
  if (data.auditId) {
    const audit = await audits.get(data.auditId);
    if (!audit) throw new Error("That audit no longer exists.");
    if (audit.customerId !== data.customerId) throw new Error("Audit and customer don't match.");
  }
  const created = await actionsRepo.create(data);
  if (data.auditId) await logEvent(data.auditId, user.id, `Action raised: ${data.title}`);
  refresh(data.auditId);
  return { id: created.id };
}

export async function setActionStatus(id: string, status: "OPEN" | "IN_PROGRESS" | "RESOLVED") {
  await requireStaff();
  if (!["OPEN", "IN_PROGRESS", "RESOLVED"].includes(status)) throw new Error("Invalid status.");
  const action = await actionsRepo.patch(id, { status });
  if (action.auditId) await logEvent(action.auditId, undefined, `Action "${action.title}" marked ${status.replace("_", " ").toLowerCase()}`);
  refresh(action.auditId);
}

export async function assignAction(id: string, assigneeId: string | null) {
  await requireStaff();
  const action = await actionsRepo.patch(id, { assigneeId });
  refresh(action.auditId);
}

export async function deleteCorrectiveAction(id: string) {
  await requireStaff();
  await actionsRepo.remove(id);
  refresh();
}
