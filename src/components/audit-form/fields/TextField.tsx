"use client";

export function TextField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <textarea
      className="textarea"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
    />
  );
}
