"use client";

export function SliderField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const num = value === "" ? 50 : Number(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 320 }}>
      <input
        type="range"
        min={0}
        max={100}
        value={num}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1 }}
      />
      <span className="mono" style={{ fontSize: 13, width: 32, textAlign: "right" }}>
        {num}
      </span>
    </div>
  );
}
