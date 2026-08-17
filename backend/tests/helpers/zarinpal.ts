import { BadRequestException } from '@nestjs/common';
import crypto from 'node:crypto';

export class FakeZarinpalService {
  verifyCode = 100;
  verifyRefId = '201';
  failRequest = false;
  requestCalls = 0;
  verifyCalls = 0;
  lastVerify?: { amount: number; authority: string };

  async requestPayment(): Promise<{ authority: string; paymentUrl: string }> {
    this.requestCalls += 1;

    if (this.failRequest) {
      throw new BadRequestException('Failed to create ZarinPal payment request');
    }

    const authority = `S${crypto.randomUUID().replace(/-/g, '')}`;
    return {
      authority,
      paymentUrl: `https://sandbox.zarinpal.com/pg/StartPay/${authority}`,
    };
  }

  async verifyPayment(params: { amount: number; authority: string }): Promise<{
    code: number;
    refId?: string;
  }> {
    this.verifyCalls += 1;
    this.lastVerify = params;
    return {
      code: this.verifyCode,
      refId: this.verifyRefId,
    };
  }
}
