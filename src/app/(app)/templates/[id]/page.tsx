import Link from "next/link";
import { notFound } from "next/navigation";
import { templates } from "@/lib/repo";
import { FIELD_TYPE_MAP, type TemplateField } from "@/lib/field-types";
import { FieldTypeIcon } from "@/components/template-builder/FieldTypeIcon";

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await templates.get(id);
  if (!template) notFound();

  const fields = template.fields as unknown as TemplateField[];

  return (
    <div className="card" style={{ padding: 24, maxWidth: 640 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
        <span className="pill accent">{template.category}</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/templates/${template.id}/edit`} className="btn ghost sm">
            Edit Template
          </Link>
          <Link href={`/new-audit?templateId=${template.id}`} className="btn primary sm">
            Start Audit
          </Link>
        </div>
      </div>

      <h1 className="disp" style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
        {template.name}
      </h1>
      {template.approvalRequired && (
        <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 12 }}>Requires approval before completion.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 2 }}>
        {fields.map((f) => (
          <li key={f.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, borderBottom: "1px solid var(--rule)", padding: "10px 0", fontSize: 14 }}>
            <FieldTypeIcon type={f.type} colorToken={FIELD_TYPE_MAP[f.type].colorToken} />
            <span style={{ fontWeight: 600, flex: "1 1 120px", minWidth: 0, overflowWrap: "break-word" }}>
              {f.label || <em style={{ color: "var(--ink-3)" }}>Untitled field</em>}
            </span>
            <span style={{ fontSize: 12, color: "var(--ink-2)", whiteSpace: "nowrap" }}>{FIELD_TYPE_MAP[f.type].label}</span>
            {f.required && <span className="pill danger" style={{ padding: "2px 8px", fontSize: 10 }}>Required</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
