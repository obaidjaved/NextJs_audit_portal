"use client";

import type { TemplateField } from "@/lib/field-types";
import type { ResponseObject } from "@/lib/scoring";
import { FieldRenderer } from "./FieldRenderer";

export function FieldItem({
  field,
  response,
  onChange,
  disabled,
}: {
  field: TemplateField;
  response: ResponseObject | null;
  onChange: (response: ResponseObject) => void;
  disabled?: boolean;
}) {
  if (field.type === "instruction") {
    return (
      <div style={{ padding: "10px 0" }}>
        <FieldRenderer field={field} response={response} onChange={onChange} disabled={disabled} />
      </div>
    );
  }

  return (
    <div className="form-row">
      <label>
        {field.label}
        {field.required && <span style={{ color: "var(--accent)" }}> *</span>}
      </label>
      {field.description && (
        <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "-2px 0 8px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{field.description}</p>
      )}
      <FieldRenderer field={field} response={response} onChange={onChange} disabled={disabled} />
    </div>
  );
}
