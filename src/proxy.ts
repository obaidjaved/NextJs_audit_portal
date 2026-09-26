import { auth } from "./lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { clearCallbackCookie, scrubRequestCookies } from "./lib/auth-scrub";

const handler = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname === "/login";

  // Public read-only report links carry their own unguessable token.
  if (pathname.startsWith("/share/")) return;

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
}) as unknown as (req: NextRequest) => Promise<Response | undefined>;

// A poisoned authjs.callback-url cookie makes Auth.js reject every request it
// sees with a generic 500. Strip it before auth() reads the session, pass the
// cleaned cookie to the page/server action downstream, and delete it in the
// browser so the poison does not come back on the next request.
function cleanCookie(req: NextRequest): { headers: Headers; cookie: string } | null {
  const { cookie, removed } = scrubRequestCookies(req);
  if (!removed) return null;

  const headers = new Headers(req.headers);
  if (cookie) headers.set("cookie", cookie);
  else headers.delete("cookie");
  return { headers, cookie };
}

export default async function proxy(req: NextRequest): Promise<Response | undefined> {
  const cleaned = cleanCookie(req);
  const res = cleaned
    ? await handler(new NextRequest(req.url, { headers: cleaned.headers, method: req.method }))
    : await handler(req);
  if (!res) return res;

  // Let the route render / server action see the cleaned cookie too.
  if (cleaned && res.headers.get("x-middleware-next")) {
    res.headers.set("x-middleware-override-headers", "cookie");
    res.headers.set("x-middleware-request-cookie", cleaned.cookie);
  }
  if (cleaned) res.headers.append("set-cookie", clearCallbackCookie());
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
