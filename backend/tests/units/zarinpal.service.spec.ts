import { BadRequestException } from '@nestjs/common';
import { ZarinpalService } from '../../src/payments/zarinpal.service';

describe('ZarinpalService', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.ZARINPAL_MERCHANT_ID = '11111111-1111-1111-1111-111111111111';
    process.env.ZARINPAL_CALLBACK_URL = 'http://localhost:3000/deposit/callback';
    process.env.ZARINPAL_BASE_URL = 'https://sandbox.zarinpal.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function mockJsonResponse(body: unknown) {
    globalThis.fetch = jest.fn().mockResolvedValue({
      json: async () => body,
    }) as unknown as typeof fetch;
  }

  it('posts a Request payload matching the ZarinPal API and persists the start URL', async () => {
    mockJsonResponse({
      data: {
        code: 100,
        message: 'Success',
        authority: 'A0000000000000000000000000000wwOGYpd',
      },
      errors: [],
    });

    const service = new ZarinpalService();
    const result = await service.requestPayment({
      amount: 1000000,
      description: 'Wallet deposit payment-1',
      callbackOrderId: 'payment-1',
      email: 'user@example.com',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://sandbox.zarinpal.com/pg/v4/payment/request.json',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          merchant_id: '11111111-1111-1111-1111-111111111111',
          amount: 1000000,
          currency: 'IRR',
          description: 'Wallet deposit payment-1',
          callback_url: 'http://localhost:3000/deposit/callback',
          metadata: {
            email: 'user@example.com',
            order_id: 'payment-1',
          },
        }),
      }),
    );
    expect(result).toEqual({
      authority: 'A0000000000000000000000000000wwOGYpd',
      paymentUrl:
        'https://sandbox.zarinpal.com/pg/StartPay/A0000000000000000000000000000wwOGYpd',
    });
  });

  it('rejects a Request response without code 100 and authority', async () => {
    mockJsonResponse({
      data: { code: -9, message: 'Failed' },
      errors: { code: -9, message: 'Merchant is invalid' },
    });

    const service = new ZarinpalService();
    await expect(
      service.requestPayment({
        amount: 1000,
        description: 'Wallet deposit payment-1',
        callbackOrderId: 'payment-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('posts a Verify payload using merchant_id, stored amount, and stored authority', async () => {
    mockJsonResponse({
      data: {
        code: 100,
        message: 'Verified',
        ref_id: 201,
      },
      errors: [],
    });

    const service = new ZarinpalService();
    const result = await service.verifyPayment({
      amount: 1000000,
      authority: 'A0000000000000000000000000000wwOGYpd',
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://sandbox.zarinpal.com/pg/v4/payment/verify.json',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          merchant_id: '11111111-1111-1111-1111-111111111111',
          amount: 1000000,
          authority: 'A0000000000000000000000000000wwOGYpd',
        }),
      }),
    );
    expect(result).toEqual({ code: 100, refId: '201' });
  });

  it('returns code 101 without treating it as a transport failure', async () => {
    mockJsonResponse({
      data: {
        code: 101,
        message: 'Verified',
        ref_id: 201,
      },
      errors: [],
    });

    const service = new ZarinpalService();
    const result = await service.verifyPayment({
      amount: 1000000,
      authority: 'A0000000000000000000000000000wwOGYpd',
    });

    expect(result).toEqual({ code: 101, refId: '201' });
  });
});
