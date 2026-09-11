/** Same-origin `/api` by default. Nginx (Docker) or Next rewrites (host) proxy to the backend. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
