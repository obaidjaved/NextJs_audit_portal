import { notFound, redirect } from "next/navigation";
import { audits } from "@/lib/repo";
import { requireUser } from "@/lib/access";
import { canAccessAudit, canEditAudit } from "@/lib/audit-access";
import { latestCorrectionNote } from "@/lib/audit-review";
import { AuditForm } from "@/components/audit-form/AuditForm";
import type { TemplateField } from "@/lib/field-types";
import type { ResponseObject } from "@/lib/scoring";

export default async function EditAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const audit = await audits.get(id);
  if (!audit || !(await canAccessAudit(user, audit))) notFound();
  // Submitted reports are read-only for auditors unless the administrator sent them back.
  if (!canEditAudit(user, audit)) redirect(`/audits/${id}`);

  // If the administrator sent this report back, show their instructions above the form.
  const correction = audit.needsCorrection ? latestCorrectionNote(await audits.events(id)) : null;

  const fields = Array.isArray(audit.template.fields) ? (audit.template.fields as unknown as TemplateField[]) : [];
  const responseList = Array.isArray(audit.responses) ? (audit.responses as unknown as ResponseObject[]) : [];
  const photos = Array.isArray(audit.photos) ? (audit.photos as unknown as { id: string; src: string }[]) : [];

  // Responses were saved keyed by position within the *non-instruction*
  // fields (AuditForm filters those out before saving), so the positional
  // fallback here must walk that same filtered list — indexing against the
  // raw `fields` array (which still includes instruction fields) would
  // silently pair each response with the wrong field once a template has
  // ever had an instruction field re-labeled or reordered.
  const nonInstructionFields = fields.filter((f) => f.type !== "instruction");
  const responses: Record<string, ResponseObject> = {};
  nonInstructionFields.forEach((f, i) => {
    const match = responseList.find((r) => r.label === f.label) ?? responseList[i];
    if (match) responses[f.id] = match;
  });

  return (
    <>
      {audit.needsCorrection && (
        <div role="status" className="card-soft" style={{ padding: 14, maxWidth: 860, margin: "0 auto 12px", borderLeft: "3px solid var(--danger)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Corrections requested</div>
          <p style={{ margin: 0, fontSize: 13.5, whiteSpace: "pre-wrap" }}>{correction ?? "The administrator sent this report back for corrections."}</p>
        </div>
      )}
    <AuditForm
      // Forces a remount when navigating directly between two different
      // audits' edit pages, so stale form state can't be saved over the
      // wrong audit — see the same fix on TemplateBuilder/CustomerForm.
      key={audit.id}
      auditId={audit.id}
      templateId={audit.templateId}
      customerId={audit.customerId}
      templateName={audit.template.name}
      customerName={audit.customer.name}
      fields={fields}
      initial={{
        responses,
        notes: audit.notes,
        photos,
        signature: audit.signature,
      }}
    />
    </>
  );
}
