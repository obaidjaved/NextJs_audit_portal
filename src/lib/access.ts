import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "ADMIN" | "INSPECTOR";
};

// For pages: redirects to /login when signed out.
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
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
  const session = await auth();
  const user = session?.user;
  if (!user?.id) throw new Error("You must be signed in.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireStaff();
  if (user.role !== "ADMIN") throw new Error("Only administrators can do that.");
  return user;
}
