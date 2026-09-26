import Link from "next/link";

export interface PanelAction {
  id: string;
  title: string;
  customerName: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  overdue: boolean;
}

const PILL = { CRITICAL: "danger", HIGH: "danger", MEDIUM: "warn", LOW: "pending" } as const;

export function ActionsPanel({ actions, openCount, overdueCount }: { actions: PanelAction[]; openCount: number; overdueCount: number }) {
  return (
    <div className="card panel">
      <div className="panel-top" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h3>Open Actions</h3>
        <Link href="/actions" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-ink)" }}>View all →</Link>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "4px 0 10px", flexWrap: "wrap" }}>
        <span className="pill accent">{openCount} open</span>
        {overdueCount > 0 && <span className="pill danger">{overdueCount} overdue</span>}
      </div>
      {actions.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-2)" }}>Nothing outstanding.</p>
      ) : (
        actions.map((a) => (
          <Link key={a.id} href="/actions" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: "1px solid var(--rule)", fontSize: 13 }}>
            <span className={`pill ${PILL[a.priority]}`}>{a.priority}</span>
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.title}
              <span style={{ color: "var(--ink-3)" }}> · {a.customerName}</span>
            </span>
            {a.overdue && <span style={{ color: "var(--danger)", fontSize: 11.5, fontWeight: 700 }}>Overdue</span>}
          </Link>
        ))
      )}
    </div>
  );
}
