import type { NextConfig } from "next";

// Local `next dev`: rewrite /api to the Nest process on the host.
// Docker/VPS: Nginx proxies /api to the backend; this rewrite is only a
// fallback when a request reaches the Next.js container directly.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  agentRules: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
