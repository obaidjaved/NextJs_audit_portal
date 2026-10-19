"use client";

const ROW = { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 } as const;
const BOX = { width: 18, height: 18 } as const;

// One plain checkbox (legacy templates), or a group of named checkboxes where
// any number can be ticked. The field's own label is the group's name.
export function CheckboxField({
  label,
  items,
  value,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  items?: string[];
  value: boolean;
  checked?: string[];
  onChange: (value: boolean, checked?: string[]) => void;
  disabled?: boolean;
}) {
  if (items && items.length > 0) {
    const ticked = checked ?? [];
    const toggle = (item: string) => {
      const next = ticked.includes(item) ? ticked.filter((x) => x !== item) : [...ticked, item];
      onChange(next.length > 0, next);
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }} role="group" aria-label={label}>
        {items.map((item) => (
          <label key={item} style={ROW}>
            <input type="checkbox" checked={ticked.includes(item)} disabled={disabled} onChange={() => toggle(item)} style={BOX} />
            {item}
          </label>
        ))}
      </div>
    );
  }

  return (
    <label style={ROW}>
      <input type="checkbox" checked={value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={BOX} />
      {label}
    </label>
  );
}
