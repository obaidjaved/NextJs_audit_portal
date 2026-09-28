import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "ADMIN" | "INSPECTOR";
};

// auth() re-runs the jwt callback on every call, and that callback looks the
// user up in Postgres. One page render asks several times — the layout, the
// page guard, and repo.actor() — so memoize it per request. React.cache falls
// back to a plain call outside a React render (proxy, route handlers).
export const getSession = cache(() => auth());

// For pages: redirects to /login when signed out.
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

// For Server Actions / route handlers: throw instead of redirecting.
export async function requireStaff(): Promise<SessionUser> {
  const session = await getSession();
  const user = session?.user;
  if (!user?.id) throw new Error("You must be signed in.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireStaff();
  if (user.role !== "ADMIN") throw new Error("Only administrators can do that.");
  return user;
}
