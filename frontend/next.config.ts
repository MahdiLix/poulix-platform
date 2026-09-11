import type { NextConfig } from "next";

// In-container fallback. Browsers call same-origin /api through Nginx.
const BACKEND_URL = process.env.BACKEND_URL || "http://backend:3001";

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
