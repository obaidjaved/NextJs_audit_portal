import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { CredentialsSignin } from "next-auth";
import { prisma } from "@/lib/db";
import { wp } from "@/lib/wp/client";
import { RepoError, type AppRole } from "@/lib/repo-types";
import { clearHits, hitCount, recordHit } from "@/lib/rate-limit";

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
  /** Session version: changes when the password does. */
  sv?: string;
}

// Thrown when someone has failed to sign in too many times; the login form shows its own message for it.
export class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";
}

const isWordPress = process.env.DATA_BACKEND === "wordpress";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ACCOUNT_AND_IP = 8; // wrong passwords for one account from one address
const MAX_PER_IP = 40; // wrong passwords from one address, across all accounts
const MAX_PER_ACCOUNT_NO_IP = 10; // when the address can't be told

// Compared against when the email is unknown, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = "$2b$10$R4DCaVVam.hR18Xb2y04MuAEH0ZNKXBjeYNw1cITBgsCgz7nf7bEC";

const versionOf = (passwordHash: string) => createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);

// Returns null for "wrong email or password" (a real denial). Throws RateLimitedError after too many failures,
// and throws for a backend outage during login — correct here, since login genuinely can't
// proceed without verifying, unlike the periodic re-check below.
export async function verifyCredentials(email: string, password: string, ip = ""): Promise<AuthUser | null> {
  if (isWordPress) {
    try {
      // The plugin does the throttling (per account + address); it needs to be told the address.
      return await wp<AuthUser>("/auth/login", { method: "POST", body: { email, password, clientIp: ip || undefined } });
    } catch (err) {
      if (err instanceof RepoError && err.status === 429) throw new RateLimitedError();
      if (err instanceof RepoError && err.status === 401) return null;
      throw err;
    }
  }

  const who = email.trim().toLowerCase();
  const accountBucket = ip ? `login:${who}|${ip}` : `login:${who}`;
  const ipBucket = ip ? `login-ip:${ip}` : "";
  if (
    (await hitCount(accountBucket, WINDOW_MS)) >= (ip ? MAX_PER_ACCOUNT_AND_IP : MAX_PER_ACCOUNT_NO_IP) ||
    (ipBucket && (await hitCount(ipBucket, WINDOW_MS)) >= MAX_PER_IP)
  ) {
    throw new RateLimitedError();
  }

  const user = await prisma.user.findUnique({ where: { email: who } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.active || !valid) {
    await recordHit(accountBucket);
    if (ipBucket) await recordHit(ipBucket);
    return null;
  }
  await clearHits(accountBucket);
  return { id: user.id, name: user.name, email: user.email, role: user.role, sv: versionOf(user.passwordHash) };
}

// Returns null when the user is genuinely gone/deactivated (a real "sign this
// session out"). Throws on a transport/outage error so the caller can choose
// to keep the existing session valid rather than treating "backend is slow"
// as "user was deleted".
export async function getSessionUser(id: string): Promise<{ active: boolean; role: AppRole; sv?: string } | null> {
  if (isWordPress) {
    try {
      return await wp<{ active: boolean; role: AppRole; sv?: string }>(`/users/${id}`, { userId: id });
    } catch (err) {
      if (err instanceof RepoError && (err.status === 403 || err.status === 404)) return null;
      throw err;
    }
  }
  const user = await prisma.user.findUnique({ where: { id }, select: { active: true, role: true, passwordHash: true } });
  return user ? { active: user.active, role: user.role, sv: versionOf(user.passwordHash) } : null;
}
