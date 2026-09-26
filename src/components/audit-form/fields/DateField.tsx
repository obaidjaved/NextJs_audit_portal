"use client";

export function DateField({
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
      type="date"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{ maxWidth: 200 }}
    />
  );
}
