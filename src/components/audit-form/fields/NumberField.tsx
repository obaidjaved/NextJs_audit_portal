"use client";

export function NumberField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      className="input"
      type="number"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{ maxWidth: 200 }}
    />
  );
}
