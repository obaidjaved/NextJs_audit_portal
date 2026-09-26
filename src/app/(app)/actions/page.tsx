import Link from "next/link";
import { actions as actionsRepo, customers as customersRepo, users as usersRepo } from "@/lib/wp/repo";
import { requireUser } from "@/lib/access";
import { dateOnlyStringUTC } from "@/lib/schedule";
import { ActionRow, type ActionRowData } from "@/components/actions/ActionRow";
import { ActionForm } from "@/components/actions/ActionForm";

const TABS = [
  { key: "open", label: "Open" },
  { key: "overdue", label: "Overdue" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
] as const;

const PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

export default async function ActionsPage({ searchParams }: { searchParams: Promise<{ tab?: string; customerId?: string }> }) {
  const { tab = "open", customerId } = await searchParams;
  await requireUser();

  const rows = await actionsRepo.list({ customerId });

  const todayKey = dateOnlyStringUTC(new Date());
  const all: ActionRowData[] = rows.map((a) => {
    const due = a.dueDate;
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      priority: a.priority,
      status: a.status,
      dueDate: due,
      overdue: !!due && due < todayKey && a.status !== "RESOLVED",
      customerName: a.customerName,
      auditId: a.auditId,
      auditDoc: a.auditDoc,
      assigneeId: a.assigneeId,
      assigneeName: a.assigneeName,
    };
  });

  const counts = {
    open: all.filter((a) => a.status !== "RESOLVED").length,
    overdue: all.filter((a) => a.overdue).length,
    resolved: all.filter((a) => a.status === "RESOLVED").length,
    all: all.length,
  };

  const visible = all
    .filter((a) => (tab === "resolved" ? a.status === "RESOLVED" : tab === "overdue" ? a.overdue : tab === "all" ? true : a.status !== "RESOLVED"))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const [customerRows, userRows] = await Promise.all([customersRepo.list(), usersRepo.list()]);
  const customers = customerRows.map((c) => ({ id: c.id, name: c.name }));
  const assignees = userRows.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name }));

  const qs = (t: string) => new URLSearchParams({ tab: t, ...(customerId ? { customerId } : {}) }).toString();

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
        <h1 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>Corrective Actions</h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 14 }}>
        Findings that need follow-up. Failed and marginal items are raised automatically when an inspection is submitted.
      </p>

      <div className="filter-row" style={{ marginBottom: 12 }}>
        {TABS.map((t) => (
          <Link key={t.key} href={`/actions?${qs(t.key)}`} className={tab === t.key ? "active" : ""} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            {t.label}
            <span className="mono" style={{ fontSize: 11, opacity: 0.7 }}>{counts[t.key]}</span>
          </Link>
        ))}
      </div>

      {customers.length > 0 && (
        <form method="get" action="/actions" style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <input type="hidden" name="tab" value={tab} />
          <select className="select" name="customerId" defaultValue={customerId ?? ""} style={{ maxWidth: 260 }} aria-label="Filter by customer">
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="submit" className="btn ghost sm">Filter</button>
        </form>
      )}

      {visible.length === 0 ? (
        <div className="card-soft" style={{ padding: 24, color: "var(--ink-2)" }}>
          {tab === "open" ? "Nothing outstanding — no open corrective actions." : "No actions in this view."}
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {visible.map((a, i) => (
            <ActionRow key={a.id} action={a} assignees={assignees} canEdit last={i === visible.length - 1} />
          ))}
        </div>
      )}

      {customers.length > 0 && (
        <details style={{ marginTop: 18 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--accent-ink)" }}>+ New corrective action</summary>
          <div style={{ marginTop: 10 }}>
            <ActionForm customers={customers} assignees={assignees} />
          </div>
        </details>
      )}
    </div>
  );
}
