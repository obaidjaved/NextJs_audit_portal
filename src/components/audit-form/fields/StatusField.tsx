"use client";

const OPTIONS: { value: "pass" | "marginal" | "fail"; label: string; cls: string }[] = [
  { value: "pass", label: "Pass", cls: "ok" },
  { value: "marginal", label: "Marginal", cls: "warn" },
  { value: "fail", label: "Fail", cls: "danger" },
];

export function StatusField({
  value,
  onChange,
  disabled,
}: {
  value: "pass" | "marginal" | "fail" | null;
  onChange: (value: "pass" | "marginal" | "fail") => void;
  disabled?: boolean;
}) {
  return (
    <div className="status-picker">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          className={value === opt.value ? `on ${opt.cls}` : ""}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
