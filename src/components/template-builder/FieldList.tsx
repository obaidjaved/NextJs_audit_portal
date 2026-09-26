"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { TemplateField } from "@/lib/field-types";
import { FieldTypePicker } from "./FieldTypePicker";
import { ChoiceOptionsEditor } from "./ChoiceOptionsEditor";

let idSeq = 0;
function newFieldId() {
  idSeq += 1;
  return `field-${Date.now()}-${idSeq}`;
}

export function newField(): TemplateField {
  return { id: newFieldId(), label: "", type: "text", required: false };
}

export function FieldList({
  fields,
  onChange,
}: {
  fields: TemplateField[];
  onChange: (fields: TemplateField[]) => void;
}) {
  function updateField(index: number, patch: Partial<TemplateField>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addField() {
    onChange([...fields, newField()]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {fields.map((field, i) => (
        <div key={field.id} className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--ink-3)", flex: "none" }}>
              <GripVertical size={14} />
            </button>

            <input
              className="input"
              placeholder="Field label"
              value={field.label}
              onChange={(e) => updateField(i, { label: e.target.value })}
              style={{ flex: "1 1 160px", minWidth: 0 }}
            />

            <FieldTypePicker value={field.type} onChange={(type) => updateField(i, { type, options: type === "choice" ? field.options ?? [] : undefined })} />

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", whiteSpace: "nowrap", flex: "none" }}>
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(i, { required: e.target.checked })}
              />
              Required
            </label>

            <button type="button" className="btn ghost sm" style={{ padding: 8, height: 36, width: 36, flex: "none" }} onClick={() => removeField(i)} aria-label="Remove field">
              <Trash2 size={14} />
            </button>
          </div>

          {field.type === "choice" && (
            <ChoiceOptionsEditor
              presetKey={field.presetKey}
              options={field.options ?? []}
              onChange={(presetKey, options) => updateField(i, { presetKey, options })}
            />
          )}
        </div>
      ))}

      <button type="button" className="btn ghost" onClick={addField} style={{ alignSelf: "flex-start" }}>
        <Plus size={16} /> Add field
      </button>
    </div>
  );
}
