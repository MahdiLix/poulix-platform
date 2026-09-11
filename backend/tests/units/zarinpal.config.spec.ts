import {
  getBrowserDepositCallbackUrl,
  getPaymentStartUrl,
  publicOriginFromRequest,
  resolveZarinpalCallbackUrl,
} from '../../src/payments/zarinpal.config';

describe('ZarinPal callback URLs', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses the local Nginx callback when FRONTEND_URL is localhost', () => {
    process.env.ZARINPAL_CALLBACK_URL = 'http://localhost/deposit/callback';
    process.env.FRONTEND_URL = 'http://localhost';

    expect(resolveZarinpalCallbackUrl()).toBe(
      'http://localhost/deposit/callback',
    );
  });

  it('uses the production FRONTEND_URL even if the callback env still points at localhost', () => {
    process.env.ZARINPAL_CALLBACK_URL = 'http://localhost/deposit/callback';
    process.env.FRONTEND_URL = 'https://poulix.ir';

    expect(resolveZarinpalCallbackUrl()).toBe(
      'https://poulix.ir/deposit/callback',
    );
    expect(getBrowserDepositCallbackUrl()).toBe(
      'https://poulix.ir/deposit/callback',
    );
  });

  it('uses the incoming production Host when env URLs are local', () => {
    process.env.ZARINPAL_CALLBACK_URL = 'http://localhost/deposit/callback';
    process.env.FRONTEND_URL = 'http://localhost';

    expect(
      resolveZarinpalCallbackUrl(
        publicOriginFromRequest({
          protocol: 'http',
          hostname: 'backend',
          headers: {
            'x-forwarded-host': 'poulix.ir',
            'x-forwarded-proto': 'https',
          },
        }),
      ),
    ).toBe('https://poulix.ir/deposit/callback');
  });

  it('does not treat a localhost request as a production origin', () => {
    process.env.ZARINPAL_CALLBACK_URL = 'http://localhost/deposit/callback';
    delete process.env.FRONTEND_URL;

    expect(
      publicOriginFromRequest({
        protocol: 'http',
        hostname: 'localhost',
        headers: { host: 'localhost' },
      }),
    ).toBeUndefined();
  });

  it('ignores a spoofed Host so ZarinPal cannot be sent to an attacker callback', () => {
    process.env.ZARINPAL_CALLBACK_URL = 'http://localhost/deposit/callback';
    process.env.FRONTEND_URL = 'http://localhost';

    expect(
      publicOriginFromRequest({
        protocol: 'http',
        hostname: 'backend',
        headers: {
          'x-forwarded-host': 'evil.example',
          'x-forwarded-proto': 'https',
        },
      }),
    ).toBeUndefined();
    expect(resolveZarinpalCallbackUrl('https://evil.example')).toBe(
      'http://localhost/deposit/callback',
    );
  });

  it('canonicalizes www.poulix.ir to the production callback', () => {
    process.env.ZARINPAL_CALLBACK_URL = 'http://localhost/deposit/callback';
    process.env.FRONTEND_URL = 'https://www.poulix.ir';

    expect(resolveZarinpalCallbackUrl()).toBe(
      'https://poulix.ir/deposit/callback',
    );
  });
});

describe('ZarinPal StartPay URLs', () => {
  it('keeps sandbox StartPay on the sandbox host', () => {
    expect(
      getPaymentStartUrl(
        'https://sandbox.zarinpal.com',
        'A0000000000000000000000000000wwOGYpd',
      ),
    ).toBe(
      'https://sandbox.zarinpal.com/pg/StartPay/A0000000000000000000000000000wwOGYpd',
    );
  });

  it('does not send the browser to the API host for live StartPay', () => {
    expect(
      getPaymentStartUrl(
        'https://api.zarinpal.com',
        'A0000000000000000000000000000wwOGYpd',
      ),
    ).toBe(
      'https://www.zarinpal.com/pg/StartPay/A0000000000000000000000000000wwOGYpd',
    );
    expect(
      getPaymentStartUrl(
        'https://payment.zarinpal.com',
        'A0000000000000000000000000000wwOGYpd',
      ),
    ).toBe(
      'https://www.zarinpal.com/pg/StartPay/A0000000000000000000000000000wwOGYpd',
    );
  });
});
