import { getFrontendUrl } from '../config';

const DEFAULT_SANDBOX_BASE_URL = 'https://sandbox.zarinpal.com';
const LOCAL_BROWSER_CALLBACK = 'http://localhost/deposit/callback';
const PRODUCTION_HOSTS = new Set(['poulix.ir', 'www.poulix.ir']);

export type ZarinpalConfig = {
  merchantId: string;
  callbackUrl: string;
  baseUrl: string;
};

type RequestLike = {
  protocol?: string;
  hostname?: string;
  headers?: Record<string, string | string[] | undefined>;
};

function headerFirst(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.split(',')[0]?.trim();
  }
  return value?.split(',')[0]?.trim();
}

function hostnameOf(value: string): string | null {
  try {
    const url = value.includes('://')
      ? new URL(value)
      : new URL(`http://${value}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname === 'backend' ||
    hostname === 'frontend'
  );
}

function isLocalUrl(value: string): boolean {
  const hostname = hostnameOf(value);
  return !hostname || isLocalHostname(hostname);
}

function isTrustedPublicHostname(hostname: string): boolean {
  if (PRODUCTION_HOSTS.has(hostname)) {
    return true;
  }

  const frontend = getFrontendUrl();
  if (!frontend || isLocalUrl(frontend)) {
    return false;
  }

  return hostnameOf(frontend) === hostname;
}

function toBrowserCallback(originOrUrl: string): string {
  try {
    const url = originOrUrl.includes('://')
      ? new URL(originOrUrl)
      : new URL(`http://${originOrUrl}`);
    if (url.hostname === 'www.poulix.ir') {
      url.hostname = 'poulix.ir';
    }
    url.pathname = '/deposit/callback';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return `${originOrUrl.replace(/\/$/, '')}/deposit/callback`;
  }
}

export function publicOriginFromRequest(req?: RequestLike): string | undefined {
  if (!req) return undefined;

  const host =
    headerFirst(req.headers?.['x-forwarded-host']) ||
    req.hostname ||
    headerFirst(req.headers?.host);
  if (!host) return undefined;

  const hostname = hostnameOf(host);
  if (!hostname || isLocalHostname(hostname)) return undefined;
  if (!isTrustedPublicHostname(hostname)) return undefined;

  const proto = (
    headerFirst(req.headers?.['x-forwarded-proto']) ||
    req.protocol ||
    'https'
  ).replace(/:$/, '');

  return `${proto}://${host}`.replace(/\/$/, '');
}

export function resolveZarinpalCallbackUrl(requestOrigin?: string): string {
  const configured = process.env.ZARINPAL_CALLBACK_URL?.trim();
  const frontend = getFrontendUrl();
  const request = requestOrigin?.trim().replace(/\/$/, '');

  if (frontend && !isLocalUrl(frontend)) {
    return toBrowserCallback(frontend);
  }
  const requestHost = request ? hostnameOf(request) : null;
  if (request && requestHost && isTrustedPublicHostname(requestHost)) {
    return toBrowserCallback(request);
  }
  if (configured) {
    return toBrowserCallback(configured);
  }
  if (frontend) {
    return toBrowserCallback(frontend);
  }
  return LOCAL_BROWSER_CALLBACK;
}

export function getZarinpalConfig(): ZarinpalConfig {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID;
  const callbackUrl = process.env.ZARINPAL_CALLBACK_URL;
  const baseUrl = process.env.ZARINPAL_BASE_URL ?? DEFAULT_SANDBOX_BASE_URL;

  if (!merchantId) {
    throw new Error('ZARINPAL_MERCHANT_ID environment variable is required');
  }

  if (!callbackUrl) {
    throw new Error('ZARINPAL_CALLBACK_URL environment variable is required');
  }

  return {
    merchantId,
    callbackUrl: resolveZarinpalCallbackUrl(),
    baseUrl: baseUrl.replace(/\/$/, ''),
  };
}

export function getPaymentStartUrl(baseUrl: string, authority: string): string {
  return `${paymentPageOrigin(baseUrl)}/pg/StartPay/${authority}`;
}

function paymentPageOrigin(baseUrl: string): string {
  try {
    const url = baseUrl.includes('://')
      ? new URL(baseUrl)
      : new URL(`https://${baseUrl}`);
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'sandbox.zarinpal.com') {
      return 'https://sandbox.zarinpal.com';
    }
    if (
      hostname === 'www.zarinpal.com' ||
      hostname === 'api.zarinpal.com' ||
      hostname === 'payment.zarinpal.com'
    ) {
      return 'https://www.zarinpal.com';
    }
    return `${url.protocol}//${url.host}`.replace(/\/$/, '');
  } catch {
    return baseUrl.replace(/\/$/, '') || 'https://sandbox.zarinpal.com';
  }
}

export function getBrowserDepositCallbackUrl(requestOrigin?: string): string {
  return resolveZarinpalCallbackUrl(requestOrigin);
}
