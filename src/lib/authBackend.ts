import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { wp } from "@/lib/wp/client";
import { RepoError, type AppRole } from "@/lib/repo-types";

// Deliberately separate from repo.ts: repo.postgres.ts/repo.wordpress.ts need
// the current session (to stamp createdBy/inspectorId), which means they
// import from auth.ts — so auth.ts cannot import back from repo.ts without
// creating a cycle. This module has no dependency on auth.ts and picks the
// same backend repo.ts does, via the same DATA_BACKEND env var.

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

const isWordPress = process.env.DATA_BACKEND === "wordpress";

// Returns null for "wrong email or password" (a real denial). Throws for a
// backend outage during login — correct here, since login genuinely can't
// proceed without verifying, unlike the periodic re-check below.
export async function verifyCredentials(email: string, password: string): Promise<AuthUser | null> {
  if (isWordPress) {
    try {
      return await wp<AuthUser>("/auth/login", { method: "POST", body: { email, password } });
    } catch (err) {
      if (err instanceof RepoError && (err.status === 401 || err.status === 429)) return null;
      throw err;
    }
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// Returns null when the user is genuinely gone/deactivated (a real "sign this
// session out"). Throws on a transport/outage error so the caller can choose
// to keep the existing session valid rather than treating "backend is slow"
// as "user was deleted".
export async function getSessionUser(id: string): Promise<{ active: boolean; role: AppRole } | null> {
  if (isWordPress) {
    try {
      return await wp<{ active: boolean; role: AppRole }>(`/users/${id}`, { userId: id });
    } catch (err) {
      if (err instanceof RepoError && (err.status === 403 || err.status === 404)) return null;
      throw err;
    }
  }
  return prisma.user.findUnique({ where: { id }, select: { active: true, role: true } });
}
