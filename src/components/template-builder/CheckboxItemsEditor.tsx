"use client";

import { Plus, X } from "lucide-react";

// Names of the checkboxes under a checkbox field. The field's label is the
// group's name; leave this empty for a single plain checkbox.
export function CheckboxItemsEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  return (
    <div style={{ marginTop: 12, paddingLeft: 12, borderLeft: "2px solid var(--rule)", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>
        Checkboxes {items.length === 0 && <span style={{ fontWeight: 500 }}>(none added — shows as a single checkbox)</span>}
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" disabled aria-hidden="true" style={{ width: 16, height: 16, flex: "none" }} />
          <input
            className="input"
            placeholder={`Checkbox ${i + 1} name`}
            value={item}
            maxLength={120}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            style={{ flex: 1, minWidth: 0 }}
          />
          <button
            type="button"
            className="btn ghost sm"
            style={{ padding: 8, height: 36, width: 36, flex: "none" }}
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label={`Remove checkbox ${i + 1}`}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => onChange([...items, ""])}>
        <Plus size={14} /> Add checkbox
      </button>
    </div>
  );
}
