import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials, getSessionUser } from "./authBackend";

// How often an already-issued session re-checks the user is still active/has
// the same role. Doing this on *every* request (the previous behavior) adds a
// full backend round trip to every navigation, and whether that backend is
// serverless Postgres or a WordPress REST API, that round trip can be slow to
// wake from idle or occasionally fail — which, with no timeout or fallback,
// silently killed the whole session and bounced the user back to /login. The
// timestamp lives in the JWT itself (not server memory) so the throttle is
// correct even though each request may land on a different serverless instance.
const RECHECK_INTERVAL_MS = 5 * 60 * 1000;
const DB_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ]);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        return verifyCredentials(email, password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.checkedAt = Date.now();
        return token;
      }

      const dueForRecheck = !token.checkedAt || Date.now() - token.checkedAt > RECHECK_INTERVAL_MS;
      if (token.id && dueForRecheck) {
        try {
          const fresh = await withTimeout(getSessionUser(token.id), DB_TIMEOUT_MS);
          if (!fresh || !fresh.active) return null;
          token.role = fresh.role;
          token.checkedAt = Date.now();
        } catch {
          // Backend was slow or unreachable — keep the existing session valid
          // rather than signing the user out; we'll retry on the next request
          // (token.checkedAt is left unset so this isn't treated as a fresh check).
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role ?? "INSPECTOR";
      }
      return session;
    },
  },
});
