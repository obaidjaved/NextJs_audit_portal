import { notFound } from "next/navigation";
import { templates, customers } from "@/lib/repo";
import { AuditForm } from "@/components/audit-form/AuditForm";
import type { TemplateField } from "@/lib/field-types";

export default async function NewAuditFormPage({
  params,
}: {
  params: Promise<{ templateId: string; customerId: string }>;
}) {
  const { templateId, customerId } = await params;

  const [template, customer] = await Promise.all([templates.get(templateId), customers.get(customerId)]);

  if (!template || !customer) notFound();

  const fields = Array.isArray(template.fields) ? (template.fields as unknown as TemplateField[]) : [];

  return (
    <AuditForm
      // Forces a remount when switching template/customer via "Change
      // Selection" without a full reload — see the same fix elsewhere.
      key={`${template.id}:${customer.id}`}
      templateId={template.id}
      customerId={customer.id}
      templateName={template.name}
      customerName={customer.name}
      fields={fields}
    />
  );
}
