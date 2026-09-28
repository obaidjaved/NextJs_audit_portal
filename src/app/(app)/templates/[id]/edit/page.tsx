import { notFound } from "next/navigation";
import { templates } from "@/lib/repo";
import { TemplateBuilder, type TemplateFormState } from "@/components/template-builder/TemplateBuilder";
import type { TemplateField } from "@/lib/field-types";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await templates.get(id);
  if (!template) notFound();

  const fields = Array.isArray(template.fields) ? (template.fields as unknown as TemplateField[]) : [];

  const initial: Partial<TemplateFormState> = {
    name: template.name,
    category: template.category,
    fields,
    approvalRequired: template.approvalRequired,
    reportStyle: template.reportStyle,
    reportAccentColor: template.reportAccentColor,
    reportLogo: template.reportLogo,
  };

  return (
    <div>
      <h1 className="disp" style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
        Edit Template
      </h1>
      {/* key forces a remount when navigating directly between two templates'
          edit pages — otherwise React reuses the same TemplateBuilder
          instance, its useState initializer never re-runs, and saving would
          silently overwrite this template with the previous one's content. */}
      <TemplateBuilder key={template.id} templateId={template.id} initial={initial} />
    </div>
  );
}
