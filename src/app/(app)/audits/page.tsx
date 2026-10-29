import Link from "next/link";
import { audits as auditsRepo, customers as customersRepo, emailTemplates as emailTemplatesRepo, users as usersRepo } from "@/lib/repo";
import { requireUser } from "@/lib/access";
import { AUDIT_VIEWS, buildAuditRows, buildAuditorRows, type AuditView } from "@/lib/audit-rows";
import { AuditsTable } from "@/components/audits/AuditsTable";

// The email action runs here: building the PDF and handing it to the mail server can take a while.
export const maxDuration = 60;

export default async function AuditsPage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string }> }) {
  const { q = "", view = "all" } = await searchParams;
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
        initialView={AUDIT_VIEWS.includes(view as AuditView) ? (view as AuditView) : "all"}
        isAdmin={isAdmin}
        auditors={staff.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name }))}
        templates={templates.map((t) => ({ id: t.id, name: t.name, subject: t.subject, body: t.body, attachReport: t.attachReport }))}
      />
    </div>
  );
}
