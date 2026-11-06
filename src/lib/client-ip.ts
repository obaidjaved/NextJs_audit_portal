// The visitor's IP address as the hosting platform reports it ("" when it can't be told).
export function clientIpFrom(headers: Headers): string {
  const raw = headers.get("x-vercel-forwarded-for") || headers.get("x-forwarded-for")?.split(",")[0] || headers.get("x-real-ip") || "";
  const ip = raw.trim();
  // Anything that is not a plain IPv4/IPv6 address is ignored rather than used as a key.
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : "";
}
