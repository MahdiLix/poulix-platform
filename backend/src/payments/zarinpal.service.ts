import { BadRequestException, Injectable } from '@nestjs/common';
import { getPaymentStartUrl, getZarinpalConfig, type ZarinpalConfig } from './zarinpal.config';

type ZarinpalData = {
  code?: number;
  message?: string;
  authority?: string;
  ref_id?: number | string;
};

type ZarinpalResponse = {
  data?: ZarinpalData | ZarinpalData[] | null;
  errors?: { code?: number; message?: string } | unknown[] | null;
};

@Injectable()
export class ZarinpalService {
  private getConfig(): ZarinpalConfig {
    return getZarinpalConfig();
  }

  async requestPayment(params: {
    amount: number;
    description: string;
    callbackOrderId: string;
    email?: string;
  }): Promise<{ authority: string; paymentUrl: string }> {
    const config = this.getConfig();
    const payload = {
      merchant_id: config.merchantId,
      amount: params.amount,
      currency: 'IRR',
      description: params.description,
      callback_url: config.callbackUrl,
      metadata: {
        email: params.email,
        order_id: params.callbackOrderId,
      },
    };

    const body = await this.postJson('/pg/v4/payment/request.json', payload);
    const data = this.extractData(body);
    const code = Number(data.code);

    if (code !== 100 || !data.authority) {
      throw new BadRequestException(
        this.errorMessage(body, 'Failed to create ZarinPal payment request'),
      );
    }

    return {
      authority: data.authority,
      paymentUrl: getPaymentStartUrl(config.baseUrl, data.authority),
    };
  }

  async verifyPayment(params: { amount: number; authority: string }): Promise<{
    code: number;
    refId?: string;
  }> {
    const config = this.getConfig();
    const body = await this.postJson('/pg/v4/payment/verify.json', {
      merchant_id: config.merchantId,
      amount: params.amount,
      authority: params.authority,
    });
    const data = this.extractData(body);
    const code = Number(data.code);

    if (!Number.isFinite(code)) {
      throw new BadRequestException(
        this.errorMessage(body, 'Failed to verify ZarinPal payment'),
      );
    }

    return {
      code,
      refId: data.ref_id === undefined ? undefined : String(data.ref_id),
    };
  }

  private extractData(body: ZarinpalResponse): ZarinpalData {
    if (body.data && !Array.isArray(body.data)) {
      return body.data;
    }

    return {};
  }

  private errorMessage(body: ZarinpalResponse, fallback: string): string {
    const errors = body.errors;
    const entry = Array.isArray(errors) ? errors[0] : errors;

    if (
      entry &&
      typeof entry === 'object' &&
      'message' in entry &&
      typeof entry.message === 'string'
    ) {
      return entry.message;
    }

    return fallback;
  }

  private async postJson(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<ZarinpalResponse> {
    const config = this.getConfig();
    let response: Response;

    try {
      response = await fetch(`${config.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new BadRequestException('Failed to reach ZarinPal');
    }

    const body = (await response.json().catch(() => null)) as ZarinpalResponse | null;

    if (!body) {
      throw new BadRequestException('Invalid response from ZarinPal');
    }

    return body;
  }
}
