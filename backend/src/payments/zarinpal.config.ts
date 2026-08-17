const DEFAULT_SANDBOX_BASE_URL = 'https://sandbox.zarinpal.com';

export type ZarinpalConfig = {
  merchantId: string;
  callbackUrl: string;
  baseUrl: string;
};

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
    callbackUrl,
    baseUrl: baseUrl.replace(/\/$/, ''),
  };
}

export function getPaymentStartUrl(baseUrl: string, authority: string): string {
  return `${baseUrl}/pg/StartPay/${authority}`;
}
