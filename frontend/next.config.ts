import type { NextConfig } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: `${BACKEND_URL}/auth/:path*`,
      },
      {
        source: '/users/:path*',
        destination: `${BACKEND_URL}/users/:path*`,
      },
      {
        source: '/wallets/:path*',
        destination: `${BACKEND_URL}/wallets/:path*`,
      },
      {
        source: '/transactions',
        destination: `${BACKEND_URL}/transactions`,
      },
      {
        source: '/transactions/:path*',
        destination: `${BACKEND_URL}/transactions/:path*`,
      },
    ];
  },
};

export default nextConfig;
