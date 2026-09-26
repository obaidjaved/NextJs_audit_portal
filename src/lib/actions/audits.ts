"use server";

import { revalidatePath } from "next/cache";
import { audits, templates, type Audit } from "@/lib/wp/repo";
import { WpError } from "@/lib/wp/client";
import { auditInputSchema } from "@/lib/validation/audit";
import { parseOrThrow } from "@/lib/validation/parse";
import { computeScore, computeCriticalFail, type ResponseObject } from "@/lib/scoring";
import { nextDocNumber } from "@/lib/doc-number";
import { requireStaff, requireAdmin } from "@/lib/access";
import { syncActionsFromAudit, logEvent } from "@/lib/corrective";

function notFound(what: string) {
  return new Error(`This ${what} no longer exists — it may have been deleted.`);
}

function raisedMessage(n: number) {
  return `${n} corrective action${n === 1 ? "" : "s"} raised`;
}

export async function saveAudit(input: unknown) {
  const user = await requireStaff();
  const data = parseOrThrow(auditInputSchema, input);

  const template = await templates.get(data.templateId);
  if (!template) throw notFound("template");

  const responses = data.responses as ResponseObject[];
  const score = data.draft ? null : computeScore(responses);
  const criticalFail = data.draft ? false : computeCriticalFail(responses);
  const pendingApproval = !data.draft && template.approvalRequired;

  // Document numbers come from an atomic counter; if two saves still collide on the
  // unique index, take the next number and try again.
  let audit: Audit | null = null;
  for (let attempt = 0; attempt < 4 && !audit; attempt++) {
    const docNumber = await nextDocNumber(template.category);
    try {
      audit = await audits.create({
        docNumber,
        templateId: data.templateId,
        customerId: data.customerId,
        title: template.name,
        score,
        criticalFail,
        draft: data.draft,
        pendingApproval,
        responses: data.responses,
        notes: data.notes,
        photos: data.photos,
        signature: data.signature,
      });
    } catch (err) {
      if (!(err instanceof WpError && err.code === "duplicate_doc_number")) throw err;
    }
  }
  if (!audit) throw new Error("Could not allocate a document number. Please try again.");

  await logEvent(audit.id, user.id, data.draft ? "Draft started" : "Inspection submitted");
  if (!data.draft) {
    const raised = await syncActionsFromAudit(audit, responses);
    if (raised > 0) await logEvent(audit.id, user.id, raisedMessage(raised));
  }

  revalidatePath("/audits");
  revalidatePath("/actions");
  revalidatePath("/customers");
  revalidatePath("/");
  return { id: audit.id };
}

export async function updateAudit(id: string, input: unknown) {
  const user = await requireStaff();
  const data = parseOrThrow(auditInputSchema, input);
  const existing = await audits.get(id);
  if (!existing) throw notFound("audit");

  const responses = data.responses as ResponseObject[];
  const score = data.draft ? null : computeScore(responses);
  const criticalFail = data.draft ? false : computeCriticalFail(responses);
  const pendingApproval = !data.draft && existing.template.approvalRequired;

  await audits.update(id, {
    responses: data.responses,
    notes: data.notes,
    photos: data.photos,
    signature: data.signature,
    draft: data.draft,
    score,
    criticalFail,
    pendingApproval,
  });

  await logEvent(id, user.id, data.draft ? "Draft saved" : "Inspection submitted");
  if (!data.draft) {
    const raised = await syncActionsFromAudit({ id, customerId: existing.customerId, title: existing.title }, responses);
    if (raised > 0) await logEvent(id, user.id, raisedMessage(raised));
  }

  revalidatePath("/audits");
  revalidatePath(`/audits/${id}`);
  revalidatePath("/actions");
  revalidatePath("/customers");
  revalidatePath("/");
  return { id };
}

export async function duplicateAudit(id: string) {
  const user = await requireStaff();
  const original = await audits.get(id);
  if (!original) throw notFound("audit");

  let copy: Audit | null = null;
  for (let attempt = 0; attempt < 4 && !copy; attempt++) {
    const docNumber = await nextDocNumber(original.template.category);
    try {
      copy = await audits.create({
        docNumber,
        templateId: original.templateId,
        customerId: original.customerId,
        title: original.title,
        draft: true,
        pendingApproval: false,
        score: null,
        criticalFail: false,
        responses: original.responses,
        notes: original.notes,
        photos: [],
        signature: null,
      });
    } catch (err) {
      if (!(err instanceof WpError && err.code === "duplicate_doc_number")) throw err;
    }
  }
  if (!copy) throw new Error("Could not allocate a document number. Please try again.");

  await logEvent(copy.id, user.id, `Duplicated from ${original.docNumber}`);
  revalidatePath("/audits");
  return { id: copy.id };
}

export async function approveAudit(id: string) {
  const user = await requireAdmin();
  await audits.update(id, { pendingApproval: false });
  await logEvent(id, user.id, "Approved for release");
  revalidatePath("/audits");
  revalidatePath(`/audits/${id}`);
}

export async function deleteAudit(id: string) {
  await requireAdmin();
  await audits.remove(id);
  revalidatePath("/audits");
}

// Enables/disables the public read-only report link for a finished audit.
export async function setAuditSharing(id: string, enabled: boolean) {
  const user = await requireStaff();
  const audit = await audits.get(id);
  if (!audit) throw new Error("Audit not found.");
  if (enabled && (audit.draft || audit.pendingApproval)) {
    throw new Error("Only submitted, approved audits can be shared.");
  }
  const { shareToken } = await audits.setShare(id, enabled);
  await logEvent(id, user.id, enabled ? "Public report link created" : "Public report link revoked");
  revalidatePath(`/audits/${id}`);
  return { shareToken };
}
