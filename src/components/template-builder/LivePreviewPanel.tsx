"use client";

import { useState } from "react";
import type { TemplateField } from "@/lib/field-types";
import { buildResponse } from "@/lib/field-types";
import type { ResponseObject } from "@/lib/scoring";
import { FieldItem } from "@/components/audit-form/FieldItem";

function PreviewFieldItem({ field }: { field: TemplateField }) {
  const [response, setResponse] = useState<ResponseObject | null>(() => (buildResponse(field) as ResponseObject) ?? null);
  return <FieldItem field={field} response={response} onChange={setResponse} />;
}

export function LivePreviewPanel({ fields, templateName }: { fields: TemplateField[]; templateName: string }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em" }}>
        Live Preview
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 10 }}>{templateName || "Untitled Template"}</h3>

      {fields.length === 0 ? (
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>Add a field to see it previewed here.</p>
      ) : (
        <div>
          {fields.map((field) => (
            <PreviewFieldItem key={field.id} field={field} />
          ))}
        </div>
      )}
    </div>
  );
}
