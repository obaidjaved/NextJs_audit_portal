"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import { requests, RepoError } from "@/lib/repo";
import { leadSchema, quoteRequestSchema } from "@/lib/validation/quote-request";
import { parseOrThrow } from "@/lib/validation/parse";
import { attempt, type ActionResult } from "./result";

// Best-effort, per-instance throttle for the public form (5 submissions / hour / IP).
// Serverless instances don't share memory, so this only blunts casual spam;
// the honeypot and validation do the rest.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function throttled(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  hits.set(key, [...recent, now]);
  return false;
}

// Public: called from the unauthenticated /request-quote page.
export async function submitQuoteRequest(input: unknown): Promise<ActionResult> {
  return attempt(async () => {
    const raw = (input ?? {}) as Record<string, unknown>;
    // Honeypot: real users never fill this hidden field. Pretend success so bots learn nothing.
    if (typeof raw.website === "string" && raw.website.trim() !== "") return;

    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    if (throttled(ip)) throw new Error("Too many requests from your network. Please try again later or call us.");

    const data = parseOrThrow(quoteRequestSchema, raw);
    await requests.create(data);
    revalidatePath("/leads");
  });
}

// Staff: add a lead by hand (phone call, email, trade show). Same record as a
// public-form submission, with looser validation (see leadSchema).
export async function createLead(input: unknown): Promise<ActionResult> {
  return attempt(async () => {
    await requireAdmin();
    const data = parseOrThrow(leadSchema, input ?? {});
    await requests.create(data, { manual: true });
    revalidatePath("/leads");
  });
}

function reviewError(err: unknown): Error {
  if (err instanceof RepoError && (err.status === 409 || err.status === 404)) {
    return new Error("This lead was already reviewed or no longer exists.");
  }
  return err instanceof Error ? err : new Error("Something went wrong. Please try again.");
}

export async function rejectQuoteRequest(id: string, note?: string): Promise<ActionResult> {
  return attempt(async () => {
    await requireAdmin();
    try {
      await requests.reject(id, note?.trim().slice(0, 500) || undefined);
    } catch (err) {
      throw reviewError(err);
    }
    revalidatePath("/leads");
  });
}
