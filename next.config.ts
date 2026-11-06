import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Where the page may load things from. Next.js writes small inline scripts into every page, so scripts keep 'unsafe-inline';
// the rest of the policy (no framing by other sites, no plug-ins, forms only post back here) is what stops the common attacks.
const BLOB = "https://*.public.blob.vercel-storage.com";
const GOOGLE_CAPTCHA = "https://www.google.com https://www.gstatic.com https://www.recaptcha.net";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${GOOGLE_CAPTCHA}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${BLOB} ${GOOGLE_CAPTCHA}`,
  `media-src 'self' blob: ${BLOB}`,
  "font-src 'self' data:",
  `connect-src 'self' ${BLOB} https://*.vercel-storage.com https://vercel.com https://nominatim.openstreetmap.org ${GOOGLE_CAPTCHA}${isDev ? " ws: wss:" : ""}`,
  `frame-src ${GOOGLE_CAPTCHA}`,
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  // Don't announce the framework in every response.
  poweredByHeader: false,
  experimental: {
    // Audits are saved through a server action; photos kept inline (no Blob
    // store) travel in that payload. The default 1MB limit would reject them.
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: baseHeaders },
      // Pages only: PDFs and downloads under /api keep the browser's own viewer, which a strict policy can break.
      { source: "/((?!api/).*)", headers: [{ key: "Content-Security-Policy", value: csp }] },
    ];
  },
};

export default nextConfig;
