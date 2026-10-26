import Link from "next/link";
import { requests as requestsRepo } from "@/lib/repo";
import { requireUser } from "@/lib/access";
import { LeadsTable, type LeadRow } from "@/components/leads/LeadsTable";

export default async function LeadsPage() {
  const user = await requireUser();
  const rows = await requestsRepo.list();

  const leads: LeadRow[] = rows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    companyName: r.companyName,
    title: r.title,
    street: r.street,
    street2: r.street2,
    city: r.city,
    state: r.state,
    zip: r.zip,
    phone: r.phone,
    email: r.email,
    services: r.services,
    dateNeeded: r.dateNeeded,
    additionalInfo: r.additionalInfo,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewedBy: r.reviewedByName,
    reviewNote: r.reviewNote,
    customerId: r.customerId,
    leadStatus: r.leadStatus,
    paymentStatus: r.paymentStatus,
    budgetQuote: r.budgetQuote,
    amountPaid: r.amountPaid,
    paymentProofs: r.paymentProofs,
    payments: r.payments,
  }));

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>Leads</h1>
          <p style={{ color: "var(--ink-2)", fontSize: 13, marginTop: 4 }}>
            Every request-a-quote submission, plus leads you add yourself. Track each one; once the customer has paid, attach the proof and convert it into a customer.
          </p>
        </div>
        <Link href="/leads/new" className="btn primary">+ Add lead</Link>
      </div>

      <LeadsTable leads={leads} canReview={user.role === "ADMIN"} />
    </div>
  );
}
