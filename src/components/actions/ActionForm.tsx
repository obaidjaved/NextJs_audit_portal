"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCorrectiveAction } from "@/lib/actions/corrective";

const FIELD = { display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" } as const;

export function ActionForm({
  customers,
  assignees,
  fixedCustomerId,
  auditId,
  onDone,
}: {
  customers: { id: string; name: string }[];
  assignees: { id: string; name: string }[];
  fixedCustomerId?: string;
  auditId?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    customerId: fixedCustomerId ?? customers[0]?.id ?? "",
    assigneeId: "",
    dueDate: "",
  });

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await createCorrectiveAction({
          title: state.title,
          description: state.description,
          priority: state.priority,
          customerId: state.customerId,
          auditId: auditId ?? null,
          assigneeId: state.assigneeId || null,
          dueDate: state.dueDate || null,
        });
        setState((s) => ({ ...s, title: "", description: "", dueDate: "" }));
        router.refresh();
        onDone?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create action.");
      }
    });
  }

  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
      <label style={FIELD}>
        Title
        <input className="input" value={state.title} onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))} placeholder="e.g. Re-torque lugs on Panel B" />
      </label>
      <label style={FIELD}>
        Details
        <textarea className="input" rows={3} value={state.description} onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))} style={{ height: "auto", padding: 12 }} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {!fixedCustomerId && (
          <label style={FIELD}>
            Customer
            <select className="select" value={state.customerId} onChange={(e) => setState((s) => ({ ...s, customerId: e.target.value }))}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        )}
        <label style={FIELD}>
          Priority
          <select className="select" value={state.priority} onChange={(e) => setState((s) => ({ ...s, priority: e.target.value as typeof s.priority }))}>
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
              <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </label>
        <label style={FIELD}>
          Assignee
          <select className="select" value={state.assigneeId} onChange={(e) => setState((s) => ({ ...s, assigneeId: e.target.value }))}>
            <option value="">Unassigned</option>
            {assignees.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>
        <label style={FIELD}>
          Due date
          <input className="input" type="date" value={state.dueDate} onChange={(e) => setState((s) => ({ ...s, dueDate: e.target.value }))} />
        </label>
      </div>
      {error && <div className="pill danger" style={{ width: "fit-content", whiteSpace: "normal" }}>{error}</div>}
      <button type="button" className="btn primary sm" disabled={pending || !state.title.trim() || !state.customerId} onClick={save} style={{ alignSelf: "flex-start" }}>
        {pending ? "Saving…" : "Add action"}
      </button>
    </div>
  );
}
