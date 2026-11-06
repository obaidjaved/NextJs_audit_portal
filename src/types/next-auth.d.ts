import type { DefaultSession } from "next-auth";

type AppRole = "ADMIN" | "INSPECTOR";

declare module "next-auth" {
  interface User {
    role?: AppRole;
    sv?: string;
  }
  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    checkedAt?: number;
    /** Session version: changes when the password does, which ends sessions opened with the old one. */
    sv?: string;
  }
}
