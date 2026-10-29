"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/access";
import { audits, customers, emailTemplates, mail, RepoError } from "@/lib/repo";
import { buildAuditPdf } from "@/lib/audit-pdf";
import { applyMerge, mergeValuesFor } from "@/lib/email-merge";
import { serviceTypesOf } from "@/lib/ops-options";
import { logEvent } from "@/lib/corrective";
import { parseOrThrow } from "@/lib/validation/parse";
import { attempt, type ActionResult } from "./result";

const sendSchema = z.object({
  to: z.string().trim().email("Enter a valid email address").max(200),
  subject: z.string().trim().min(1, "Enter a subject").max(255),
  body: z.string().trim().min(1, "Write a message").max(20000),
  attachReport: z.boolean().default(false),
});

// Sends an email about an audit to its customer; optionally attaches the report as a PDF.
export async function sendAuditEmail(auditId: string, input: unknown): Promise<ActionResult> {
  return attempt(async () => {
    const user = await requireStaff();
    const data = parseOrThrow(sendSchema, input);
    const audit = await audits.get(auditId);
    if (!audit) throw new Error("This audit no longer exists.");

    const customer = await customers.get(audit.customerId);
    const values = mergeValuesFor(audit, {
      service: customer ? serviceTypesOf(customer.services).join(", ") : "",
      auditorName: audit.inspector?.name ?? customer?.assignedAuditorName ?? "",
    });
    const subject = applyMerge(data.subject, values);
    const body = applyMerge(data.body, values);

    const attachments: { filename: string; contentType: string; contentBase64: string }[] = [];
    if (data.attachReport) {
      if (audit.draft || audit.pendingApproval) throw new Error("The report can only be attached once the audit is completed and approved.");
      const pdf = await buildAuditPdf(audit);
      attachments.push({ filename: `${audit.docNumber}.pdf`, contentType: "application/pdf", contentBase64: Buffer.from(pdf).toString("base64") });
    }

    try {
      await mail.send({ to: data.to, subject, body, attachments });
    } catch (err) {
      if (err instanceof RepoError && err.code === "backend_unreachable") {
        throw new Error("The mail server took too long to answer. The email may still have been sent — check with the customer before sending it again.");
      }
      throw err;
    }
    await logEvent(auditId, user.id, `Email sent to ${data.to}${attachments.length ? " with the report attached" : ""}`);
    revalidatePath(`/audits/${auditId}`);
  });
}

const templateSchema = z.object({
  name: z.string().trim().min(1, "Enter a template name").max(120),
  subject: z.string().trim().min(1, "Enter a subject").max(255),
  body: z.string().trim().min(1, "Write the message").max(20000),
  attachReport: z.boolean().default(false),
});

export async function saveEmailTemplate(id: string | null, input: unknown): Promise<ActionResult> {
  return attempt(async () => {
    await requireAdmin();
    const data = parseOrThrow(templateSchema, input);
    if (id) await emailTemplates.update(id, data);
    else await emailTemplates.create(data);
    revalidatePath("/email-templates");
    revalidatePath("/audits");
  });
}

export async function deleteEmailTemplate(id: string): Promise<ActionResult> {
  return attempt(async () => {
    await requireAdmin();
    await emailTemplates.remove(id);
    revalidatePath("/email-templates");
    revalidatePath("/audits");
  });
}
