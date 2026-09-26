"use client";

import { Plus, X } from "lucide-react";
import { RESPONSE_SETS, type ChoiceOption } from "@/lib/field-types";

export function ChoiceOptionsEditor({
  presetKey,
  options,
  onChange,
}: {
  presetKey: string | undefined;
  options: ChoiceOption[];
  onChange: (presetKey: string, options: ChoiceOption[]) => void;
}) {
  function applyPreset(key: string) {
    const preset = RESPONSE_SETS.find((r) => r.key === key);
    if (preset) onChange(key, preset.options.map((o) => ({ ...o })));
  }

  function updateOption(index: number, patch: Partial<ChoiceOption>) {
    const next = options.map((o, i) => (i === index ? { ...o, ...patch } : o));
    onChange("custom", next);
  }

  function addOption() {
    onChange("custom", [...options, { label: "New option", score: 100, fail: false }]);
  }

  function removeOption(index: number) {
    onChange("custom", options.filter((_, i) => i !== index));
  }

  return (
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="filter-row">
        {RESPONSE_SETS.map((preset) => (
          <button key={preset.key} type="button" className={presetKey === preset.key ? "active" : ""} onClick={() => applyPreset(preset.key)}>
            {preset.name}
          </button>
        ))}
        <button type="button" className={presetKey === "custom" || !presetKey ? "active" : ""} onClick={() => onChange("custom", options)}>
          Custom
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map((opt, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              className="input"
              value={opt.label}
              onChange={(e) => updateOption(i, { label: e.target.value })}
              style={{ flex: 1 }}
            />
            <input
              className="input"
              type="number"
              min={0}
              max={100}
              placeholder="Score"
              value={opt.score ?? ""}
              onChange={(e) => updateOption(i, { score: e.target.value === "" ? null : Number(e.target.value) })}
              style={{ width: 84 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-2)" }}>
              <input type="checkbox" checked={opt.fail} onChange={(e) => updateOption(i, { fail: e.target.checked })} />
              Fail
            </label>
            <button
              type="button"
              className="btn ghost sm"
              style={{ padding: 8, height: 32, width: 32 }}
              onClick={() => removeOption(i)}
              aria-label="Remove option"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button type="button" className="btn ghost sm" onClick={addOption} style={{ alignSelf: "flex-start" }}>
          <Plus size={14} /> Add option
        </button>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
          Preview
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {options.map((opt, i) => (
            <span
              key={i}
              className={`pill ${opt.fail ? "danger" : opt.score !== null && opt.score < 100 ? "warn" : "ok"}`}
            >
              {opt.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
