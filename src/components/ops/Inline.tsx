"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unwrap } from "@/lib/actions/result";

// Small editable cells for the dashboards. Each saves on change/blur through
// the `save` callback (a server action) and shows its own error underneath.

function useSave(save: (value: never) => Promise<unknown>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(value: unknown, onFail?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await save(value as never));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
        onFail?.();
      }
    });
  }
  return { pending, error, run };
}

const Err = ({ error }: { error: string | null }) =>
  error ? (
    <div role="alert" style={{ color: "var(--danger)", fontSize: 11.5, marginTop: 4, maxWidth: 200, whiteSpace: "normal" }}>
      {error}
    </div>
  ) : null;

export function InlineSelect({
  value,
  options,
  onSave,
  disabled,
  label,
}: {
  value: string;
  options: readonly string[] | { value: string; label: string }[];
  onSave: (value: string) => Promise<unknown>;
  disabled?: boolean;
  label: string;
}) {
  const { pending, error, run } = useSave(onSave);
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div>
      <select
        className="select dt-select"
        aria-label={label}
        value={value}
        disabled={disabled || pending}
        onChange={(e) => run(e.target.value)}
      >
        {!opts.some((o) => o.value === value) && <option value={value}>{value || "—"}</option>}
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Err error={error} />
    </div>
  );
}

export function InlineMoney({
  value,
  onSave,
  label,
  disabled,
  nullable = true,
}: {
  value: number | null;
  onSave: (value: number | null) => Promise<unknown>;
  label: string;
  disabled?: boolean;
  nullable?: boolean;
}) {
  const { pending, error, run } = useSave(onSave);
  const [text, setText] = useState(value === null ? "" : String(value));
  const [seen, setSeen] = useState(value);
  // Follow the saved value when the server sends a fresh one.
  if (seen !== value) {
    setSeen(value);
    setText(value === null ? "" : String(value));
  }

  function commit() {
    const trimmed = text.trim();
    const next = trimmed === "" ? (nullable ? null : 0) : Number(trimmed);
    if (next !== null && (!Number.isFinite(next) || next < 0)) {
      setText(value === null ? "" : String(value));
      return;
    }
    if (next === value) return;
    run(next, () => setText(value === null ? "" : String(value)));
  }

  return (
    <div>
      <div className="dt-money">
        <span aria-hidden="true">$</span>
        <input
          className="input dt-input"
          inputMode="decimal"
          aria-label={label}
          value={text}
          disabled={disabled || pending}
          placeholder="0.00"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </div>
      <Err error={error} />
    </div>
  );
}

export function InlineDate({
  value,
  onSave,
  label,
  disabled,
}: {
  value: string | null;
  onSave: (value: string | null) => Promise<unknown>;
  label: string;
  disabled?: boolean;
}) {
  const { pending, error, run } = useSave(onSave);
  return (
    <div>
      <input
        className="input dt-input"
        type="date"
        aria-label={label}
        value={value ?? ""}
        disabled={disabled || pending}
        onChange={(e) => run(e.target.value || null)}
      />
      <Err error={error} />
    </div>
  );
}
