import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  // PG_POOL_MAX_USES retires each pooled connection after N queries. Only needed
  // against the local `prisma dev` Postgres, which drops connections that run
  // several queries in a row; leave it unset against a real database (Vercel Postgres/Neon).
  const maxUses = Number(process.env.PG_POOL_MAX_USES) || undefined;
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, maxUses });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
