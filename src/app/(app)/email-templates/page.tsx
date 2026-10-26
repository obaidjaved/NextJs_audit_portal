import Link from "next/link";
import { emailTemplates } from "@/lib/repo";
import { requireAdminPage } from "@/lib/access";
import { EmailTemplatesManager } from "@/components/audits/EmailTemplatesManager";

export default async function EmailTemplatesPage() {
  await requireAdminPage();
  const templates = await emailTemplates.list();
  return (
    <div style={{ maxWidth: 900 }}>
      <Link href="/audits" style={{ fontSize: 13, color: "var(--ink-2)" }}>← Back to audits</Link>
      <h1 className="disp" style={{ fontSize: 22, fontWeight: 800, margin: "8px 0 4px" }}>Email templates</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 13, marginBottom: 20 }}>
        Ready-made emails you can pick from the Audits page. Merge tags such as {"{{customer_name}}"} are filled in for each customer.
      </p>
      <EmailTemplatesManager templates={templates.map((t) => ({ id: t.id, name: t.name, subject: t.subject, body: t.body, attachReport: t.attachReport }))} />
    </div>
  );
}
