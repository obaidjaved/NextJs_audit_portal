"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { assignAction, deleteCorrectiveAction, setActionStatus } from "@/lib/actions/corrective";

export interface ActionRowData {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  dueDate: string | null; // YYYY-MM-DD
  overdue: boolean;
  customerName: string;
  auditId: string | null;
  auditDoc: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
}

const PRIORITY_PILL: Record<ActionRowData["priority"], string> = { CRITICAL: "danger", HIGH: "danger", MEDIUM: "warn", LOW: "pending" };
const STATUSES = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
] as const;

function formatDue(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ActionRow({
  action,
  assignees,
  canEdit,
  last,
}: {
  action: ActionRowData;
  assignees: { id: string; name: string }[];
  canEdit: boolean;
  last: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const showOverdue = action.overdue && action.status !== "RESOLVED";

  return (
    <div style={{ padding: "14px 18px", borderBottom: last ? "none" : "1px solid var(--rule)", opacity: pending ? 0.6 : 1 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span className={`pill ${PRIORITY_PILL[action.priority]}`}>{action.priority}</span>
            <span style={{ fontWeight: 700, fontSize: 14, textDecoration: action.status === "RESOLVED" ? "line-through" : "none" }}>{action.title}</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
            {action.customerName}
            {action.auditId && (
              <>
                {" · "}
                <Link href={`/audits/${action.auditId}`} style={{ textDecoration: "underline" }}>
                  {action.auditDoc}
                </Link>
              </>
            )}
            {action.assigneeName && ` · ${action.assigneeName}`}
          </div>
          {action.description && <p style={{ fontSize: 13, marginTop: 6, color: "var(--ink-2)" }}>{action.description}</p>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          {action.dueDate && (
            <span className="mono" style={{ fontSize: 12, color: showOverdue ? "var(--danger)" : "var(--ink-2)", fontWeight: showOverdue ? 700 : 400 }}>
              {showOverdue ? "Overdue · " : "Due "}
              {formatDue(action.dueDate)}
            </span>
          )}
          {canEdit ? (
            <div className="filter-row" style={{ margin: 0 }}>
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={action.status === s.value ? "active" : ""}
                  disabled={pending}
                  onClick={() => action.status !== s.value && run(() => setActionStatus(action.id, s.value))}
                >
                  {s.label}
                </button>
              ))}
            </div>
          ) : (
            <span className={`pill ${action.status === "RESOLVED" ? "ok" : action.status === "IN_PROGRESS" ? "pending" : "warn"}`}>
              {STATUSES.find((s) => s.value === action.status)?.label}
            </span>
          )}
          {canEdit && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                className="select"
                aria-label="Assignee"
                value={action.assigneeId ?? ""}
                disabled={pending}
                onChange={(e) => run(() => assignAction(action.id, e.target.value || null))}
                style={{ height: 32, fontSize: 12.5, padding: "0 10px" }}
              >
                <option value="">Unassigned</option>
                {assignees.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn ghost sm"
                disabled={pending}
                onClick={() => confirm("Delete this action?") && run(() => deleteCorrectiveAction(action.id))}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {error && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{error}</p>}
    </div>
  );
}
