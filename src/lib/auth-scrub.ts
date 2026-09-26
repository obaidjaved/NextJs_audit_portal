// Auth.js (assertConfig) rejects the *entire* request with a generic 500
// ("There was a problem with the server configuration...") when `callbackUrl`
// is not a valid http(s) URL — either as a query param or as the
// `authjs.callback-url` cookie. A stale cookie once poisoned every auth call,
// so these helpers strip the bad values before Auth.js ever sees them.

import { NextRequest } from "next/server";

export const AUTH_CALLBACK_COOKIE = "authjs.callback-url";

export function isValidCallbackUrl(value: string, origin: string): boolean {
  try {
    const url = new URL(value, value.startsWith("/") ? origin : undefined);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export interface ScrubbedCookie {
  cookie: string;
  removed: boolean;
}

/** Drop an invalid authjs.callback-url cookie from a Cookie header. */
export function scrubAuthCookie(header: string | null, origin: string): ScrubbedCookie {
  if (!header) return { cookie: "", removed: false };

  let removed = false;
  const kept = header
    .split(";")
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) return false;
      const eq = part.indexOf("=");
      const name = eq === -1 ? part : part.slice(0, eq);
      if (name !== AUTH_CALLBACK_COOKIE) return true;
      const raw = eq === -1 ? "" : part.slice(eq + 1);
      if (isValidCallbackUrl(decodeCookieValue(raw), origin)) return true;
      removed = true;
      return false;
    });

  return { cookie: kept.join("; "), removed };
}

/** Same scrub, applied to a full `Cookie` header from a NextRequest. */
export function scrubRequestCookies<T extends { headers: Headers; url: string }>(req: T): ScrubbedCookie {
  const origin = new URL(req.url).origin;
  return scrubAuthCookie(req.headers.get("cookie"), origin);
}

/** Expiry header that deletes the poisoned cookie in the browser. */
export function clearCallbackCookie(): string {
  return `${AUTH_CALLBACK_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`;
}

/** Rebuild an auth API request without an invalid callbackUrl query/cookie. */
export async function scrubAuthRequest(
  req: Request,
): Promise<{ request: NextRequest; cleared: boolean }> {
  const url = new URL(req.url);
  let changed = false;

  const param = url.searchParams.get("callbackUrl");
  if (param !== null && !isValidCallbackUrl(param, url.origin)) {
    url.searchParams.delete("callbackUrl");
    changed = true;
  }

  const { cookie, removed } = scrubAuthCookie(req.headers.get("cookie"), url.origin);
  if (removed) changed = true;

  if (!changed) return { request: req as NextRequest, cleared: false };

  const headers = new Headers(req.headers);
  if (removed) {
    if (cookie) headers.set("cookie", cookie);
    else headers.delete("cookie");
  }
  const init: ConstructorParameters<typeof NextRequest>[1] = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
    headers.delete("content-length");
  }
  // NextAuth's handler reads req.nextUrl, so it must be a NextRequest.
  return { request: new NextRequest(url, init), cleared: removed };
}

