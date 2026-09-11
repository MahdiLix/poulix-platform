export type AppEnv = 'development' | 'production' | 'test';

/** Internal listen port. Public traffic reaches the backend through Nginx, not this host port. */
export const BACKEND_LISTEN_PORT = 3001;

export function getAppEnv(): AppEnv {
  const value = (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development')
    .trim()
    .toLowerCase();

  if (value === 'production' || value === 'test') {
    return value;
  }

  return 'development';
}

export function isProductionEnv(): boolean {
  return getAppEnv() === 'production';
}

export function isTestEnv(): boolean {
  return getAppEnv() === 'test';
}

export function getFrontendUrl(): string | undefined {
  const value = process.env.FRONTEND_URL?.trim();
  return value ? value.replace(/\/$/, '') : undefined;
}
