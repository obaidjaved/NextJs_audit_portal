import { headers } from "next/headers";
import { mail, users } from "@/lib/repo";

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
