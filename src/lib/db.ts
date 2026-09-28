import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  // PG_POOL_MAX_USES retires each pooled connection after N queries. Only needed
  // against the local `prisma dev` Postgres, which drops connections that run
  // several queries in a row; leave it unset against a real database (Vercel Postgres/Neon).
  const maxUses = Number(process.env.PG_POOL_MAX_USES) || undefined;
  // Every serverless isolate (the proxy runs separately from the page) gets its
  // own pool, and the database caps a role at 45 connections. pg's default of
  // 10 per pool blows past that within a handful of parallel tabs, so hold each
  // isolate to a couple of connections and fail fast instead of queueing.
  const max = Number(process.env.PG_POOL_MAX) || 2;
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    maxUses,
    max,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 5_000,
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) || 8_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
