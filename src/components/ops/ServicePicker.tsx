"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SERVICE_GROUPS } from "@/lib/quote-options";
import { unwrap } from "@/lib/actions/result";
import { ServiceChips } from "./Parts";

// The Service Type and Sub Service cells. Both show what's chosen and open the
// same drop-down panel: tick a type to select all of its sub services, or tick
// individual sub services. Everything is saved together with "Save".
export function ServicePicker({
  services,
  kind,
  onSave,
  label,
  disabled,
  requireOne = false,
}: {
  services: string[];
  kind: "type" | "sub";
  onSave: (services: string[]) => Promise<unknown>;
  label: string;
  disabled?: boolean;
  requireOne?: boolean;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<string[]>(services);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Closing with Esc or the backdrop shouldn't leave a stale draft behind.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const reset = () => setError(null);
    d.addEventListener("close", reset);
    return () => d.removeEventListener("close", reset);
  }, []);

  function openPanel() {
    setDraft(services);
    setError(null);
    dialogRef.current?.showModal();
  }

  const toggleOne = (opt: string) => setDraft((d) => (d.includes(opt) ? d.filter((x) => x !== opt) : [...d, opt]));
  const toggleGroup = (options: string[]) =>
    setDraft((d) => (options.every((o) => d.includes(o)) ? d.filter((x) => !options.includes(x)) : [...new Set([...d, ...options])]));

  function save() {
    if (requireOne && draft.length === 0) {
      setError("Choose at least one service.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await onSave(draft));
        dialogRef.current?.close();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save.");
      }
    });
  }

  return (
    <div>
      <ServiceChips services={services} kind={kind} />
      {!disabled && (
        <button type="button" className="btn ghost sm" style={{ height: 30, padding: "0 12px", marginTop: 6 }} aria-label={`Edit ${label}`} onClick={openPanel}>
          Edit ▾
        </button>
      )}

      <dialog ref={dialogRef} className="svc-dialog" aria-label={label} onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}>
        <div className="svc-panel">
          <div style={{ fontWeight: 800, fontSize: 15 }}>Service type &amp; sub service</div>
          <div className="svc-groups">
            {SERVICE_GROUPS.map((g) => {
              const picked = g.options.filter((o) => draft.includes(o)).length;
              const all = picked === g.options.length;
              return (
                <div key={g.group} className="svc-group">
                  <label className="svc-type">
                    <input
                      type="checkbox"
                      checked={all}
                      ref={(el) => {
                        if (el) el.indeterminate = picked > 0 && !all;
                      }}
                      onChange={() => toggleGroup(g.options)}
                    />
                    {g.group}
                    <span className="svc-count">{picked}/{g.options.length}</span>
                  </label>
                  {/* A group with a single option (e.g. PP Maintenance) is its own sub service. */}
                  {!(g.options.length === 1 && g.options[0] === g.group) && (
                    <div className="svc-subs">
                      {g.options.map((o) => (
                        <label key={o} className="svc-sub">
                          <input type="checkbox" checked={draft.includes(o)} onChange={() => toggleOne(o)} />
                          {o}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {error && <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn ghost sm" onClick={() => dialogRef.current?.close()} disabled={pending}>
              Cancel
            </button>
            <button type="button" className="btn primary sm" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
