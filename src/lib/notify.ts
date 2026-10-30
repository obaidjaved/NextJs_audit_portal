import { headers } from "next/headers";
import { mail, users } from "@/lib/repo";

interface NewLeadSummary {
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  services: string[];
  trainings: string[];
  dateNeeded?: string;
  additionalInfo?: string;
}

// Emails every active administrator when a quote request comes in from the website, so nobody has to keep checking the Leads tab.
// On the WordPress deployment the plugin sends this itself (the public form has no signed-in user, so this side can't).
export async function emailAdminsNewLead(lead: NewLeadSummary): Promise<void> {
  if (process.env.DATA_BACKEND === "wordpress") return;
  try {
    const admins = (await users.list()).filter((u) => u.role === "ADMIN" && u.active && u.email);
    if (admins.length === 0) return;

    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const link = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}/leads` : "";
    const who = lead.companyName || `${lead.firstName} ${lead.lastName}`.trim();
    const wanted = [...lead.services, ...lead.trainings].join(", ");
    const body = [
      "A new quote request just came in.",
      [
        `Name: ${lead.firstName} ${lead.lastName}`.trim(),
        lead.companyName ? `Company: ${lead.companyName}` : "",
        lead.email ? `Email: ${lead.email}` : "",
        lead.phone ? `Phone: ${lead.phone}` : "",
        wanted ? `Wants: ${wanted}` : "",
        lead.dateNeeded ? `Needed by: ${lead.dateNeeded}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      lead.additionalInfo ? `Notes: ${lead.additionalInfo.slice(0, 500)}` : "",
      link ? `Review it in the portal: ${link}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    await Promise.allSettled(admins.map((a) => mail.send({ to: a.email, subject: `New quote request: ${who}`, body })));
  } catch {
    // Never fail the visitor's form because a notification couldn't be sent.
  }
}

// Emails one of the team about something that needs their attention, with a link straight to it.
// Best effort: a failed email must never stop the action that triggered it, because the same news is also shown in the portal.
export async function emailTeamMember(userId: string, subject: string, paragraphs: string[], path?: string): Promise<void> {
  try {
    const person = (await users.list()).find((u) => u.id === userId && u.active);
    if (!person?.email) return;

    let link = "";
    if (path) {
      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host");
      if (host) link = `${h.get("x-forwarded-proto") ?? "https"}://${host}${path}`;
    }
    const body = [`Hello ${person.name},`, ...paragraphs, link ? `Open it here: ${link}` : "", "— TAP Ops Console"].filter(Boolean).join("\n\n");
    await mail.send({ to: person.email, subject, body });
  } catch {
    // Ignored on purpose (see above).
  }
}
