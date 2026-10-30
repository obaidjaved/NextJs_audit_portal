"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { audits, templates, type Audit, RepoError, customers, users, mail } from "@/lib/repo";
import { auditInputSchema } from "@/lib/validation/audit";
import { parseOrThrow } from "@/lib/validation/parse";
import { computeScore, computeCriticalFail, type ResponseObject } from "@/lib/scoring";
import { nextDocNumber } from "@/lib/doc-number";
import { requireStaff, requireAdmin } from "@/lib/access";
import { canAccessAudit, canEditAudit, LOCKED_MESSAGE } from "@/lib/audit-access";
import { CORRECTION_PREFIX, MAX_CORRECTION_NOTE } from "@/lib/audit-review";
import { syncActionsFromAudit, logEvent } from "@/lib/corrective";
import { attempt } from "./result";

function notFound(what: string) {
  return new Error(`This ${what} no longer exists — it may have been deleted.`);
}

function raisedMessage(n: number) {
  return `${n} corrective action${n === 1 ? "" : "s"} raised`;
}

export async function saveAudit(input: unknown) {
  return attempt(async () => {
    const user = await requireStaff();
    const data = parseOrThrow(auditInputSchema, input);
    if (user.role !== "ADMIN") {
      const customer = await customers.get(data.customerId);
      if (customer?.assignedAuditorId !== user.id) throw new Error("This customer isn't assigned to you.");
    }

    const template = await templates.get(data.templateId);
    if (!template) throw notFound("template");

    const responses = data.responses as ResponseObject[];
    const score = data.draft ? null : computeScore(responses);
    const criticalFail = data.draft ? false : computeCriticalFail(responses);
    const pendingApproval = !data.draft && (user.role !== "ADMIN" || template.approvalRequired);
    // An auditor's completed audit is kept for them to submit to the admin (it isn't with the admin yet).
    const readyToSubmit = !data.draft && user.role !== "ADMIN";

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
          readyToSubmit,
          responses: data.responses,
          notes: data.notes,
          photos: data.photos,
          signature: data.signature,
        });
      } catch (err) {
        if (!(err instanceof RepoError && err.code === "duplicate_doc_number")) throw err;
      }
    }
    if (!audit) throw new Error("Could not allocate a document number. Please try again.");

    await logEvent(audit.id, user.id, data.draft ? "Draft started" : readyToSubmit ? "Audit completed" : "Inspection submitted");
    if (!data.draft) {
      const raised = await syncActionsFromAudit(audit, responses);
      if (raised > 0) await logEvent(audit.id, user.id, raisedMessage(raised));
    }

    revalidatePath("/audits");
    revalidatePath("/actions");
    revalidatePath("/customers");
    revalidatePath("/");
    return { id: audit.id };
  });
}

export async function updateAudit(id: string, input: unknown) {
  return attempt(async () => {
    const user = await requireStaff();
    const data = parseOrThrow(auditInputSchema, input);
    const existing = await audits.get(id);
    if (!existing) throw notFound("audit");
    if (!(await canAccessAudit(user, existing))) throw notFound("audit");
    if (!canEditAudit(user, existing)) throw new Error(LOCKED_MESSAGE);

    const responses = data.responses as ResponseObject[];
    const score = data.draft ? null : computeScore(responses);
    const criticalFail = data.draft ? false : computeCriticalFail(responses);
    const pendingApproval = !data.draft && (user.role !== "ADMIN" || existing.template.approvalRequired);
    const readyToSubmit = !data.draft && user.role !== "ADMIN";

    await audits.update(id, {
      responses: data.responses,
      notes: data.notes,
      photos: data.photos,
      signature: data.signature,
      draft: data.draft,
      score,
      criticalFail,
      pendingApproval,
      readyToSubmit,
      // Completing the audit again answers a "needs correction" request.
      needsCorrection: data.draft ? undefined : false,
      correctionNote: data.draft ? undefined : "",
    });

    await logEvent(id, user.id, data.draft ? "Draft saved" : readyToSubmit ? "Audit completed" : "Inspection submitted");
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
  });
}

export async function duplicateAudit(id: string) {
  return attempt(async () => {
    const user = await requireStaff();
    const original = await audits.get(id);
    if (!original) throw notFound("audit");
    if (!(await canAccessAudit(user, original))) throw notFound("audit");

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
        if (!(err instanceof RepoError && err.code === "duplicate_doc_number")) throw err;
      }
    }
    if (!copy) throw new Error("Could not allocate a document number. Please try again.");

    await logEvent(copy.id, user.id, `Duplicated from ${original.docNumber}`);
    revalidatePath("/audits");
    return { id: copy.id };
  });
}

export async function approveAudit(id: string) {
  return attempt(async () => {
    const user = await requireAdmin();
    const audit = await audits.get(id);
    if (!audit) throw notFound("audit");
    if (audit.draft || audit.readyToSubmit) throw new Error("The auditor hasn't submitted this report yet.");
    await audits.update(id, { pendingApproval: false });
    await logEvent(id, user.id, "Approved for release");
    revalidatePath("/audits");
    revalidatePath(`/audits/${id}`);
  });
}

export async function deleteAudit(id: string) {
  return attempt(async () => {
    await requireAdmin();
    await audits.remove(id);
    revalidatePath("/audits");
  });
}

// Enables/disables the public read-only report link for a finished audit.
export async function setAuditSharing(id: string, enabled: boolean) {
  return attempt(async () => {
    // Sharing with the client is the administrator's call, once the report is approved.
    const user = await requireAdmin();
    const audit = await audits.get(id);
    if (!audit) throw new Error("Audit not found.");
    if (enabled && (audit.draft || audit.pendingApproval)) {
      throw new Error("Only submitted, approved audits can be shared.");
    }
    const { shareToken } = await audits.setShare(id, enabled);
    await logEvent(id, user.id, enabled ? "Public report link created" : "Public report link revoked");
    revalidatePath(`/audits/${id}`);
    return { shareToken };
  });
}

// Emails the auditor that a report came back. Best effort: the in-app notice and the report itself carry the same instructions.
async function notifyAuditor(audit: Audit, instructions: string) {
  try {
    const customer = await customers.get(audit.customerId);
    const auditorId = customer?.assignedAuditorId ?? audit.inspectorId;
    if (!auditorId) return;
    const auditor = (await users.list()).find((u) => u.id === auditorId);
    if (!auditor?.email) return;
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const link = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}/audits/${audit.id}/edit` : "";
    await mail.send({
      to: auditor.email,
      subject: `Corrections requested: ${audit.docNumber} — ${audit.customer.name}`,
      body: `Hello ${auditor.name},\n\nThe administrator sent audit ${audit.docNumber} (${audit.customer.name}) back for corrections:\n\n${instructions}\n\n${link ? `Open the report: ${link}\n\n` : ""}Once it's corrected, complete the audit and submit it again.`,
    });
  } catch {
    // Never block the review because an email failed.
  }
}

// The auditor sends their completed audit to the admin. From then on it is view-only for them.
export async function submitAudit(id: string) {
  return attempt(async () => {
    const user = await requireStaff();
    const audit = await audits.get(id);
    if (!audit || !(await canAccessAudit(user, audit))) throw notFound("audit");
    if (audit.draft) throw new Error("Complete the audit before submitting it.");
    if (!audit.readyToSubmit) throw new Error("This report has already been submitted to the admin.");
    await audits.update(id, { readyToSubmit: false, pendingApproval: true });
    await logEvent(id, user.id, "Submitted to the admin");
    revalidatePath("/audits");
    revalidatePath(`/audits/${id}`);
    revalidatePath("/");
  });
}

// An admin reviews a submitted audit: approve it, or send it back to the auditor to be corrected.
export async function setAuditReview(id: string, status: "Approved" | "Needs Correction", note?: string) {
  return attempt(async () => {
    const admin = await requireAdmin();
    if (status !== "Approved" && status !== "Needs Correction") throw new Error("Unknown status.");
    const audit = await audits.get(id);
    if (!audit) throw notFound("audit");
    if (status === "Approved") {
      if (audit.needsCorrection) throw new Error("This audit is with the auditor for corrections. It can be approved once they submit it again.");
      if (audit.readyToSubmit) throw new Error("The auditor has completed this audit but hasn't submitted it to you yet.");
      if (audit.draft) throw new Error("This audit hasn't been submitted yet, so it can't be approved.");
      await audits.update(id, { pendingApproval: false, needsCorrection: false });
      await logEvent(id, undefined, "Approved for release");
    } else {
      const instructions = (note ?? "").trim();
      if (!instructions) throw new Error("Please tell the auditor what needs to be corrected.");
      if (instructions.length > MAX_CORRECTION_NOTE) throw new Error(`Please keep the instructions under ${MAX_CORRECTION_NOTE} characters.`);
      // Back to the auditor as a draft; they fix it and submit it again.
      await audits.update(id, { draft: true, pendingApproval: false, readyToSubmit: false, needsCorrection: true, correctionNote: instructions });
      await logEvent(id, admin.id, CORRECTION_PREFIX + instructions);
      await notifyAuditor(audit, instructions);
    }
    revalidatePath("/audits");
    revalidatePath(`/audits/${id}`);
    revalidatePath("/");
  });
}
