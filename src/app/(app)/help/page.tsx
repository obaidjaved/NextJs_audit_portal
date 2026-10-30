import Link from "next/link";
import { requireUser } from "@/lib/access";

interface Step {
  title: string;
  body: string;
  href?: string;
  link?: string;
}

const ADMIN_STEPS: Step[] = [
  { title: "A lead comes in", body: "People fill in the Request a Quote form on the website, and it lands in Leads. You can also add one yourself (a phone call, an email).", href: "/leads", link: "Open Leads" },
  { title: "Turn the lead into a customer", body: "Open the lead, choose Convert, and record the payment received (amount, how it was paid, date and a screenshot). A lead only becomes a customer once it is paid. You can also add a paid customer directly with “+ New Customer”.", href: "/customers", link: "Open Customers" },
  { title: "Choose the auditor", body: "On the Audits tab, every customer waiting for an audit has a “Name of auditor” box. Pick the auditor there. They are emailed, and the job shows up on their dashboard.", href: "/audits?view=unassigned", link: "Audits to assign" },
  { title: "The auditor does the audit", body: "They open the job, fill in the audit, press Complete Audit, and then Submit. Until they submit, it is still theirs to edit.", },
  { title: "Review the report", body: "A submitted report shows as “Pending approval”. Open it, then use the Status box: Approved if it's right, or Needs Correction to send it back. When you send it back you write what to fix, and the auditor sees your note.", href: "/audits?status=Pending%20approval", link: "Reports to review" },
  { title: "Send it to the customer", body: "Once a report is Approved, “Send Report” and “Create public link” unlock. Send Report emails the PDF to the customer using one of your email templates.", href: "/audits?view=completed", link: "Approved reports" },
  { title: "Finish the customer", body: "When the work is done, mark the customer Completed and record any final payment. Payment Status on the Customers tab shows every payment, and what is still owed.", href: "/customers", link: "Open Customers" },
];

const AUDITOR_STEPS: Step[] = [
  { title: "See what is assigned to you", body: "The Console shows how many audits are assigned and due. Schedules lists your open jobs, soonest first, with the address and the date it is needed.", href: "/schedules", link: "Open Schedules" },
  { title: "Start the audit", body: "On the Audits tab, press “Start audit” next to the customer. Pick the audit form and fill it in. Use “Save Draft” if you need to stop and finish later.", href: "/audits", link: "Open Audits" },
  { title: "Complete it", body: "When everything is filled in, press “Complete Audit”. The report is saved and shows “Ready to submit”. You can still press Edit Report to change it.", },
  { title: "Submit it to the admin", body: "Press Submit when you are happy with it. After that you can view the PDF but not change it, and the submission can't be undone.", },
  { title: "If it comes back", body: "If the admin sends a report back, you get an email and a notice on the Console, and it counts as due again. Their instructions are printed in the same row on the Audits tab. Press Edit Report, make the fixes, then Complete Audit and Submit again.", href: "/audits?status=Needs%20Correction", link: "Reports sent back" },
];

const STATUSES: [string, string][] = [
  ["In progress", "Started, not finished yet."],
  ["Ready to submit", "Completed by the auditor, waiting for them to submit it to the admin."],
  ["Pending approval", "Submitted. Waiting for the admin to review it."],
  ["Needs Correction", "Sent back to the auditor with instructions."],
  ["Approved", "Final. The report can be sent to the customer."],
];

export default async function HelpPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const steps = isAdmin ? ADMIN_STEPS : AUDITOR_STEPS;

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="disp" style={{ fontSize: 22, fontWeight: 800 }}>How the portal works</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 13.5, margin: "6px 0 18px" }}>
        {isAdmin ? "From a new enquiry to a report in the customer's inbox, in seven steps." : "From a new job to a submitted report, in five steps."} The{" "}
        <Link href="/">Console</Link> always shows what needs your attention next.
      </p>

      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((s, i) => (
          <li key={s.title} className="card" style={{ padding: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span className="mono" style={{ flex: "none", width: 28, height: 28, borderRadius: 999, background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 3px" }}>{s.title}</h2>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{s.body}</p>
              {s.href && (
                <Link href={s.href} className="btn ghost sm" style={{ marginTop: 10, display: "inline-flex" }}>
                  {s.link}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <h2 className="disp" style={{ fontSize: 16, fontWeight: 800, margin: "26px 0 8px" }}>What the statuses mean</h2>
      <div className="card" style={{ padding: "4px 16px" }}>
        {STATUSES.map(([name, meaning]) => (
          <div key={name} style={{ display: "flex", gap: 14, padding: "10px 0", borderBottom: "1px solid var(--rule)", flexWrap: "wrap" }}>
            <strong style={{ flex: "0 0 150px", fontSize: 13.5 }}>{name}</strong>
            <span style={{ flex: "1 1 220px", fontSize: 13.5, color: "var(--ink-2)" }}>{meaning}</span>
          </div>
        ))}
      </div>

      <p style={{ color: "var(--ink-2)", fontSize: 12.5, marginTop: 18 }}>
        Stuck or something looks wrong? Tell your administrator what you were doing and which page you were on.
      </p>
    </div>
  );
}
