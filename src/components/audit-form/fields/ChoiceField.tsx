"use client";

import type { ChoiceOption } from "@/lib/field-types";

export function ChoiceField({
  options,
  value,
  onChange,
  disabled,
}: {
  options: ChoiceOption[];
  value: ChoiceOption | null;
  onChange: (option: ChoiceOption) => void;
  disabled?: boolean;
}) {
  return (
    <div className="status-picker">
      {options.map((opt, i) => {
        const active = value?.label === opt.label;
        const cls = opt.fail ? "danger" : opt.score !== null && opt.score < 100 ? "warn" : "ok";
        return (
          <button key={i} type="button" disabled={disabled} className={active ? `on ${cls}` : ""} onClick={() => onChange(opt)}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
