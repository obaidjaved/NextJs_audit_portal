import { notFound } from "next/navigation";
import { audits } from "@/lib/wp/repo";
import { requireUser } from "@/lib/access";
import { AuditForm } from "@/components/audit-form/AuditForm";
import type { TemplateField } from "@/lib/field-types";
import type { ResponseObject } from "@/lib/scoring";

export default async function EditAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const audit = await audits.get(id);
  if (!audit) notFound();

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
  );
}
