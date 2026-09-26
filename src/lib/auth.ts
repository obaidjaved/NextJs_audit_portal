import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { wp, WpError } from "./wp/client";

type WpUser = { id: string; name: string; email: string; role: "ADMIN" | "INSPECTOR"; active?: boolean };

// Session re-validation asks WordPress on each request so a deactivation or role
// change takes effect immediately; a short cache keeps that from hammering WP.
const RECHECK_TTL_MS = 20_000;
const recheckCache = new Map<string, { at: number; user: WpUser | null }>();

async function currentWpUser(id: string): Promise<WpUser | null | "unknown"> {
  const hit = recheckCache.get(id);
  if (hit && Date.now() - hit.at < RECHECK_TTL_MS) return hit.user;
  try {
    const user = await wp<WpUser>(`/users/${id}`, { userId: id });
    const result = user.active === false ? null : user;
    recheckCache.set(id, { at: Date.now(), user: result });
    return result;
  } catch (err) {
    // Unknown/forbidden user -> session is no longer valid. Any other failure
    // (WordPress unreachable) must not sign everyone out.
    if (err instanceof WpError && (err.status === 403 || err.status === 404)) {
      recheckCache.set(id, { at: Date.now(), user: null });
      return null;
    }
    return "unknown";
  }
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

        try {
          const user = await wp<WpUser>("/auth/login", { method: "POST", body: { email, password } });
          return { id: user.id, name: user.name, email: user.email, role: user.role };
        } catch (err) {
          if (err instanceof WpError && (err.status === 401 || err.status === 429)) return null;
          throw err;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        return token;
      }
      if (token.id) {
        const fresh = await currentWpUser(token.id);
        if (fresh === null) return null;
        if (fresh !== "unknown") token.role = fresh.role;
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
