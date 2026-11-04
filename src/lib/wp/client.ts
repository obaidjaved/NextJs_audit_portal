import { revalidateTag } from "next/cache";
import { RepoError } from "@/lib/repo-types";

// Server-side only: WP_API_KEY is not a NEXT_PUBLIC_ variable, so it never reaches the browser.

function config() {
  const base = process.env.WP_API_URL?.replace(/\/+$/, "");
  const key = process.env.WP_API_KEY;
  if (!base || !key) throw new Error("WordPress backend is not configured (set WP_API_URL and WP_API_KEY).");
  return { base, key };
}

// Every page asks WordPress for several lists, and each round trip to the host costs a second or more. The lists are kept for a
// few seconds and shared by all pages, so moving between tabs doesn't repeat the same calls. Any change made through the portal
// clears them straight away (see invalidate below), so people see their own changes immediately.
const READ_CACHE_SECONDS = 15;
const CACHE_TAG = "wp";
const CACHEABLE_LISTS = new RegExp("^/(audits|customers|templates|requests|users|actions|schedules|email-templates)(/pending-count)?$");

// Only the small list endpoints. A single audit (photos, signatures) can be large, and the audit list is only kept when it leaves out the answers.
function cacheable(path: string, query: WpRequest["query"]): boolean {
  if (!CACHEABLE_LISTS.test(path)) return false;
  if (path === "/audits" && !query?.noResponses) return false;
  return true;
}

function invalidate() {
  try {
    revalidateTag(CACHE_TAG, { expire: 0 });
  } catch {
    // Not in a context that can invalidate (for example while rendering a page); the short lifetime covers it.
  }
}

export interface WpRequest {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** WordPress user id to act as. Omit for public endpoints (login, share token, intake). */
  userId?: string;
  /** Abort the request after this many ms instead of hanging indefinitely. Default 8000. */
  timeoutMs?: number;
  /** Repeat a write once if the host answered 502/503 (it never reached WordPress, so nothing was saved). Reads always retry. */
  retryUnavailable?: boolean;
}

// The WordPress host is slow to wake up now and then (a first request can take several seconds, or return a 502/503/504).
// Reads are safe to repeat, so they get one more try before the page gives up; writes are never repeated.
export async function wp<T>(path: string, req: WpRequest = {}): Promise<T> {
  const isRead = (req.method ?? "GET") === "GET";
  try {
    return await wpOnce<T>(path, req);
  } catch (err) {
    if (!(err instanceof RepoError)) throw err;
    // A timeout (504) may have been saved anyway, so only reads repeat on it.
    const retry = isRead ? [502, 503, 504].includes(err.status) : !!req.retryUnavailable && [502, 503].includes(err.status);
    if (!retry) throw err;
    return wpOnce<T>(path, req);
  }
}

async function wpOnce<T>(path: string, req: WpRequest): Promise<T> {
  const { base, key } = config();
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(req.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { "X-TAP-Key": key, Accept: "application/json" };
  if (req.userId) headers["X-TAP-User"] = req.userId;
  if (req.body !== undefined) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 8000);

  const method = req.method ?? "GET";
  const keep = method === "GET" && cacheable(path, req.query);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      ...(keep ? { next: { revalidate: READ_CACHE_SECONDS, tags: [CACHE_TAG] } } : { cache: "no-store" as const }),
      signal: controller.signal,
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    throw new RepoError(timedOut ? 504 : 502, "backend_unreachable", "Could not reach the WordPress backend. Please try again.");
  } finally {
    clearTimeout(timeout);
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON body (e.g. an HTML error page from the host).
  }

  if (!res.ok) {
    const err = (data ?? {}) as { code?: string; message?: string };
    throw new RepoError(res.status, err.code ?? "error", err.message ?? `WordPress returned ${res.status}`);
  }
  if (method !== "GET") invalidate();
  return data as T;
}
