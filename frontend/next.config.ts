import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${BACKEND_URL}/auth/:path*`,
      },
      {
        source: "/users/:path*",
        destination: `${BACKEND_URL}/users/:path*`,
      },
      {
        source: "/wallets/:path*",
        destination: `${BACKEND_URL}/wallets/:path*`,
      },
      {
        source: "/transactions",
        destination: `${BACKEND_URL}/transactions`,
      },
      {
        source: "/transactions/:path*",
        destination: `${BACKEND_URL}/transactions/:path*`,
      },
      {
        source: "/scheduled-payments",
        destination: `${BACKEND_URL}/scheduled-payments`,
      },
      {
        source: "/scheduled-payments/:path*",
        destination: `${BACKEND_URL}/scheduled-payments/:path*`,
      },
      {
        source: "/financial-destinations",
        destination: `${BACKEND_URL}/financial-destinations`,
      },
      {
        source: "/financial-destinations/:path*",
        destination: `${BACKEND_URL}/financial-destinations/:path*`,
      },
      {
        source: "/spending-limits",
        destination: `${BACKEND_URL}/spending-limits`,
      },
      {
        source: "/spending-limits/:path*",
        destination: `${BACKEND_URL}/spending-limits/:path*`,
      },
      {
        source: "/notifications",
        destination: `${BACKEND_URL}/notifications`,
      },
      {
        source: "/notifications/:path*",
        destination: `${BACKEND_URL}/notifications/:path*`,
      },
      {
        source: "/goals",
        destination: `${BACKEND_URL}/goals`,
      },
      {
        source: "/goals/:path*",
        destination: `${BACKEND_URL}/goals/:path*`,
      },
      {
        source: "/envelopes",
        destination: `${BACKEND_URL}/envelopes`,
      },
      {
        source: "/envelopes/:path*",
        destination: `${BACKEND_URL}/envelopes/:path*`,
      },
      {
        source: "/security/:path*",
        destination: `${BACKEND_URL}/security/:path*`,
      },
      {
        source: "/admin/:path*",
        destination: `${BACKEND_URL}/admin/:path*`,
      },
    ];
  },
};

export default nextConfig;
