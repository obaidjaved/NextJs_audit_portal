import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

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

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
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
      // Re-check on every request so deactivating a user or changing their
      // role takes effect immediately instead of at token expiry.
      //
      // Returning null here makes Auth.js delete the session cookie, so a
      // lookup we *know* failed must not be treated as a revoked user — that
      // is what logged people out whenever the connection pool ran dry.
      if (token.id) {
        try {
          const fresh = await prisma.user.findUnique({ where: { id: token.id }, select: { active: true, role: true } });
          if (!fresh || !fresh.active) return null;
          token.role = fresh.role;
        } catch (err) {
          console.error("[auth] user revalidation failed; keeping session", err);
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
