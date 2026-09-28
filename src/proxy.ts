import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public pages: read-only report links (unguessable token) and the quote request form.
  if (pathname.startsWith("/share/") || pathname === "/request-quote") return;

  // Verify the session cookie without touching the database — decoding the JWE
  // is pure CPU. Going through auth() here would run the jwt callback's user
  // lookup, and this isolate's pool opens a fresh TCP+TLS connection on every
  // request, which alone was ~290ms of every page view (the same query costs
  // ~17ms where connections stay warm).
  //
  // Trusting the signature alone means a deactivated user still passes this
  // gate, so active-user enforcement lives in requireUser()/requireStaff() and
  // in the jwt callback that auth() runs for them. The cookie name doubles as
  // the JWE salt, so pick whichever one is actually present rather than
  // guessing from protocol.
  const cookieName = req.cookies.get("__Secure-authjs.session-token")
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });

  if (!token && pathname !== "/login") {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Note: there is deliberately no "signed in but on /login" bounce here. This
  // gate cannot tell an active user from a deactivated one, so bouncing would
  // loop between /login and the layout's requireUser(). login/page.tsx does that
  // bounce instead, where auth() can check the database.
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
