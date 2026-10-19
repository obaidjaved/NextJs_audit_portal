import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Audits are saved through a server action; photos kept inline (no Blob
    // store) travel in that payload. The default 1MB limit would reject them.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
