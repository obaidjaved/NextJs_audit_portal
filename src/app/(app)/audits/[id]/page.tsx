import { notFound } from "next/navigation";
import { requireUser } from "@/lib/access";
import { audits, actions, users } from "@/lib/repo";
import { AuditReport } from "@/components/audits/AuditReport";
import { AuditActionsBar } from "@/components/audits/AuditActionsBar";
import { SharePanel } from "@/components/audits/SharePanel";
import { ActionRow, type ActionRowData } from "@/components/actions/ActionRow";
import { ActionForm } from "@/components/actions/ActionForm";
import { dateOnlyStringUTC } from "@/lib/schedule";

const SECTION_LABEL = { fontSize: 11, fontWeight: 700, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: ".05em" } as const;

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const audit = await audits.get(id);
  if (!audit) notFound();

  const [auditActions, userRows, events] = await Promise.all([
    actions.list({ auditId: id }),
    users.list(),
    audits.events(id),
  ]);
  const assignees = userRows.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name }));

  const todayKey = dateOnlyStringUTC(new Date());
  const actionRows: ActionRowData[] = [...auditActions]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      priority: a.priority,
      status: a.status,
      dueDate: a.dueDate,
      overdue: !!a.dueDate && a.dueDate < todayKey,
      customerName: a.customerName,
      auditId: null,
      auditDoc: null,
      assigneeId: a.assigneeId,
      assigneeName: a.assigneeName,
    }));

  return (
    <div>
      <AuditReport
        audit={audit}
        headerSlot={
          <AuditActionsBar
            auditId={audit.id}
            draft={audit.draft}
            pendingApproval={audit.pendingApproval}
            canApprove={user.role === "ADMIN"}
          />
        }
      />

      <div className="card" style={{ maxWidth: 760, marginTop: 16, overflow: "hidden" }}>
        <div style={{ ...SECTION_LABEL, padding: "16px 18px 6px" }}>Corrective actions ({actionRows.length})</div>
        {actionRows.length === 0 ? (
          <p style={{ padding: "6px 18px 16px", fontSize: 13, color: "var(--ink-2)" }}>
            No corrective actions{audit.draft ? " yet — they're raised automatically for failed items when the audit is submitted." : "."}
          </p>
        ) : (
          actionRows.map((a, i) => <ActionRow key={a.id} action={a} assignees={assignees} canEdit last={i === actionRows.length - 1} />)
        )}
      </div>

      <details className="no-print" style={{ maxWidth: 760, marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--accent-ink)" }}>+ Add corrective action</summary>
        <div style={{ marginTop: 10 }}>
          <ActionForm customers={[{ id: audit.customerId, name: audit.customer.name }]} fixedCustomerId={audit.customerId} auditId={audit.id} assignees={assignees} />
        </div>
      </details>

      <SharePanel auditId={audit.id} initialToken={audit.shareToken} canShare={!audit.draft && !audit.pendingApproval} />

      <div className="card-soft no-print" style={{ padding: 16, maxWidth: 760, marginTop: 16 }}>
        <div style={{ ...SECTION_LABEL, marginBottom: 8 }}>Activity</div>
        {events.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-2)" }}>No activity recorded.</p>}
        {events.map((e) => (
          <div key={e.id} style={{ display: "flex", gap: 10, fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>
            <span className="mono" style={{ color: "var(--ink-3)", flex: "none", minWidth: 118 }}>
              {e.createdAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
            <span>
              {e.message}
              {e.userName && <span style={{ color: "var(--ink-3)" }}> · {e.userName}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
