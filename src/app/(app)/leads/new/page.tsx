import Link from "next/link";
import { requireAdminPage } from "@/lib/access";
import { LeadForm } from "@/components/leads/LeadForm";

export default async function NewLeadPage() {
  await requireAdminPage();
  return (
    <div style={{ maxWidth: 900 }}>
      <Link href="/leads" style={{ fontSize: 13, color: "var(--ink-2)" }}>← Back to leads</Link>
      <h1 className="disp" style={{ fontSize: 22, fontWeight: 800, margin: "8px 0 4px" }}>Add lead</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 13, marginBottom: 20 }}>
        For enquiries that didn’t come through the website — a phone call, an email, a referral.
      </p>
      <LeadForm />
    </div>
  );
}
