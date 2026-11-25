"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { TemplateField } from "@/lib/field-types";
import { FieldTypePicker } from "./FieldTypePicker";
import { ChoiceOptionsEditor } from "./ChoiceOptionsEditor";
import { CheckboxItemsEditor } from "./CheckboxItemsEditor";

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

  // The field just removed, kept for a moment so a slip of the mouse can be undone.
  const [removed, setRemoved] = useState<{ field: TemplateField; index: number } | null>(null);

  function removeField(index: number) {
    setRemoved({ field: fields[index], index });
    onChange(fields.filter((_, i) => i !== index));
  }

  function undoRemove() {
    if (!removed) return;
    const next = [...fields];
    next.splice(Math.min(removed.index, next.length), 0, removed.field);
    onChange(next);
    setRemoved(null);
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
      {removed && (
        <div role="status" className="card-soft" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", fontSize: 13 }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            Removed <strong>{removed.field.label || "an empty field"}</strong>.
          </span>
          <button type="button" className="btn ghost sm" onClick={undoRemove}>Undo</button>
          <button type="button" className="btn ghost sm" style={{ padding: "0 10px" }} onClick={() => setRemoved(null)} aria-label="Dismiss">✕</button>
        </div>
      )}
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

            <FieldTypePicker value={field.type} onChange={(type) =>
                updateField(i, {
                  type,
                  options: type === "choice" ? field.options ?? [] : undefined,
                  items: type === "checkbox" ? field.items : undefined,
                })
              }
            />

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", whiteSpace: "nowrap", flex: "none" }}>
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(i, { required: e.target.checked })}
              />
              Required
            </label>

            <button type="button" className="btn ghost sm" style={{ padding: 8, height: 36, width: 36, flex: "none" }} onClick={() => removeField(i)} aria-label={`Remove ${field.label || "field"}`} title="Remove this field">
              <Trash2 size={14} />
            </button>
          </div>

          {field.type !== "instruction" && (
            <input
              className="input"
              placeholder="Description (optional) — explains the field to the inspector"
              value={field.description ?? ""}
              maxLength={500}
              onChange={(e) => updateField(i, { description: e.target.value || undefined })}
              style={{ marginTop: 10, fontSize: 13 }}
            />
          )}

          {field.type === "checkbox" && (
            <CheckboxItemsEditor items={field.items ?? []} onChange={(items) => updateField(i, { items: items.length > 0 ? items : undefined })} />
          )}

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
