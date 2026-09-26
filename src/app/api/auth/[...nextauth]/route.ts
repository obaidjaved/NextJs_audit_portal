import { handlers } from "@/lib/auth";
import { clearCallbackCookie, scrubAuthRequest } from "@/lib/auth-scrub";
import type { NextRequest } from "next/server";

// Auth.js answers a bad callbackUrl with an opaque 500 JSON blob, so strip the
// offending query param / cookie before the request reaches it.
async function handle(request: NextRequest, method: "GET" | "POST") {
  const { request: scrubbed, cleared } = await scrubAuthRequest(request);
  const res = method === "GET" ? await handlers.GET(scrubbed) : await handlers.POST(scrubbed);
  if (cleared) res.headers.append("set-cookie", clearCallbackCookie());
  return res;
}

export function GET(request: NextRequest) {
  return handle(request, "GET");
}

export function POST(request: NextRequest) {
  return handle(request, "POST");
}
