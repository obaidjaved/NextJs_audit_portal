import Link from "next/link";
import { audits as auditsRepo, customers as customersRepo, emailTemplates as emailTemplatesRepo, users as usersRepo } from "@/lib/repo";
import { requireUser } from "@/lib/access";
import { AUDIT_VIEWS, buildAuditRows, buildAuditorRows, type AuditView } from "@/lib/audit-rows";
import { todayKey } from "@/lib/schedule";
import { AuditsTable } from "@/components/audits/AuditsTable";

// The email action runs here: building the PDF and handing it to the mail server can take a while.
export const maxDuration = 60;

export default async function AuditsPage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string; status?: string }> }) {
  const { q = "", view = "all", status = "All" } = await searchParams;
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const [audits, customers, templates, staff] = await Promise.all([
    auditsRepo.list({ noResponses: true }),
    customersRepo.list(),
    emailTemplatesRepo.list(),
    // Only administrators assign auditors, so only they need the list.
    isAdmin ? usersRepo.list() : Promise.resolve([]),
  ]);
  const rows = isAdmin ? buildAuditRows(audits, customers) : buildAuditorRows(audits, customers, user.id);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
        <h1 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>Audits</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isAdmin && <Link href="/email-templates" className="btn ghost sm">Email templates</Link>}
          {isAdmin && <a href="/api/export/audits" className="btn ghost sm">Export CSV</a>}
          <Link href="/new-audit" className="btn primary sm">+ New Audit</Link>
        </div>
      </div>

      <AuditsTable
        rows={rows}
        initialQuery={q}
        initialStatus={status}
        initialView={AUDIT_VIEWS.includes(view as AuditView) ? (view as AuditView) : "all"}
        isAdmin={isAdmin}
        todayKey={todayKey()}
        auditors={staff.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name }))}
        templates={templates.map((t) => ({ id: t.id, name: t.name, subject: t.subject, body: t.body, attachReport: t.attachReport }))}
      />
      <details style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink-2)" }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>What do the statuses mean?</summary>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
          <li><strong>In progress</strong> — started, not finished.</li>
          <li><strong>Ready to submit</strong> — completed by the auditor, not yet sent to the admin.</li>
          <li><strong>Pending approval</strong> — submitted; waiting for the admin to review it.</li>
          <li><strong>Needs Correction</strong> — sent back to the auditor with instructions.</li>
          <li><strong>Approved</strong> — final; the report can be sent to the customer.</li>
        </ul>
      </details>
    </div>
  );
}
