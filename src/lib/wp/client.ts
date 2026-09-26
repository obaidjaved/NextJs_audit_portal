// Server-side only: WP_API_KEY is not a NEXT_PUBLIC_ variable, so it never reaches the browser.
export class WpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "WpError";
  }
}

function config() {
  const base = process.env.WP_API_URL?.replace(/\/+$/, "");
  const key = process.env.WP_API_KEY;
  if (!base || !key) throw new Error("WordPress backend is not configured (set WP_API_URL and WP_API_KEY).");
  return { base, key };
}

export interface WpRequest {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** WordPress user id to act as. Omit for public endpoints (login, share token, intake). */
  userId?: string;
}

export async function wp<T>(path: string, req: WpRequest = {}): Promise<T> {
  const { base, key } = config();
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(req.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { "X-TAP-Key": key, Accept: "application/json" };
  if (req.userId) headers["X-TAP-User"] = req.userId;
  if (req.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method: req.method ?? "GET",
      headers,
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new Error("Could not reach the WordPress backend. Please try again.");
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
    throw new WpError(res.status, err.code ?? "error", err.message ?? `WordPress returned ${res.status}`);
  }
  return data as T;
}
