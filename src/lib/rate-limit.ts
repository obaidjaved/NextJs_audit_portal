import { prisma } from "@/lib/db";

// Small database-backed counters, shared by every serverless instance (an in-memory counter is not).
// Used by the Postgres deployment; on the WordPress deployment the plugin keeps its own counters.

const KEEP_MS = 24 * 60 * 60 * 1000;

// Counts one event and says whether it is allowed (at most `max` per `windowMs`). Uses the database when there is one;
// the WordPress deployment has none, so there it falls back to a per-instance counter (fine for blunting abuse, not exact).
const memory = new Map<string, number[]>();
export async function allow(bucket: string, max: number, windowMs: number): Promise<boolean> {
  if (process.env.DATA_BACKEND === "wordpress") {
    const now = Date.now();
    const recent = (memory.get(bucket) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      memory.set(bucket, recent);
      return false;
    }
    memory.set(bucket, [...recent, now]);
    return true;
  }
  if ((await hitCount(bucket, windowMs)) >= max) return false;
  await recordHit(bucket);
  return true;
}

export async function hitCount(bucket: string, windowMs: number): Promise<number> {
  return prisma.rateLimitHit.count({ where: { bucket, createdAt: { gt: new Date(Date.now() - windowMs) } } });
}

export async function recordHit(bucket: string): Promise<void> {
  await prisma.rateLimitHit.create({ data: { bucket } });
  // Tidy up now and then so the table stays small.
  if (Math.random() < 0.02) await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - KEEP_MS) } } }).catch(() => undefined);
}

export async function clearHits(bucket: string): Promise<void> {
  await prisma.rateLimitHit.deleteMany({ where: { bucket } });
}
