import type { SessionUser } from "@/lib/access";

// A line in the hosting platform's logs for every sensitive change (who did what to which record), so there is a trail
// if something goes wrong. Never put passwords or personal details in the details.
export function logAdminAction(actor: Pick<SessionUser, "id" | "email">, action: string, detail?: Record<string, string | boolean | number>): void {
  console.info(JSON.stringify({ type: "admin-action", at: new Date().toISOString(), actor: actor.id, actorEmail: actor.email ?? undefined, action, ...detail }));
}
