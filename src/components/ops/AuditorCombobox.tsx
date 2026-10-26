"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unwrap } from "@/lib/actions/result";

// "Query assigned to": a search box + drop-down of auditors. The list floats above the table
// (fixed position) so the table's edges never clip it.
export function AuditorCombobox({
  value,
  auditors,
  onSave,
  disabled,
  label = "Assigned auditor",
}: {
  value: string | null;
  auditors: { id: string; name: string }[];
  onSave: (id: string | null) => Promise<unknown>;
  disabled?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220, up: false });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const current = auditors.find((a) => a.id === value);
  const shown = auditors.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if ((t as HTMLElement).closest?.("[data-auditor-list]")) return;
      setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const width = Math.max(r.width, 220);
      const up = window.innerHeight - r.bottom < 300 && r.top > 300;
      setPos({ top: up ? r.top - 6 : r.bottom + 6, left: Math.min(r.left, window.innerWidth - width - 12), width, up });
      setQuery("");
    }
    setOpen((o) => !o);
  }

  function choose(id: string | null) {
    setOpen(false);
    if (id === value) return;
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await onSave(id));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        className="select dt-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled || pending}
        onClick={toggle}
        style={{ textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
      >
        {current ? current.name : <span style={{ color: "var(--ink-3)" }}>Select auditor…</span>}
      </button>
      {error && <div role="alert" style={{ color: "var(--danger)", fontSize: 11.5, marginTop: 4 }}>{error}</div>}

      {open && (
        <div
          data-auditor-list
          className="card"
          style={{ position: "fixed", top: pos.up ? undefined : pos.top, bottom: pos.up ? window.innerHeight - pos.top : undefined, left: pos.left, width: pos.width, zIndex: 200, padding: 8, boxShadow: "var(--shadow-lg)" }}
        >
          <input autoFocus className="input" placeholder="Search auditors…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ height: 36, fontSize: 13, marginBottom: 6 }} />
          <ul role="listbox" style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 240, overflowY: "auto" }}>
            <li>
              <button type="button" role="option" aria-selected={!value} onClick={() => choose(null)} style={optionStyle(!value)}>
                Unassigned
              </button>
            </li>
            {shown.map((a) => (
              <li key={a.id}>
                <button type="button" role="option" aria-selected={a.id === value} onClick={() => choose(a.id)} style={optionStyle(a.id === value)}>
                  {a.name}
                </button>
              </li>
            ))}
            {shown.length === 0 && <li style={{ padding: "8px 10px", fontSize: 13, color: "var(--ink-2)" }}>No auditors match.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

const optionStyle = (active: boolean) =>
  ({
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 10px",
    border: "none",
    borderRadius: 10,
    background: active ? "var(--rule)" : "transparent",
    cursor: "pointer",
    fontSize: 13.5,
    fontWeight: 600,
    color: "var(--ink)",
  }) as const;
