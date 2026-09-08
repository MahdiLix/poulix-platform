import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ZarinpalService } from './zarinpal.service';

function toJsonNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const numeric = Number(String(value));
  return Number.isFinite(numeric) ? numeric : undefined;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly zarinpal: ZarinpalService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createDeposit(userId: string, amount: number) {
    const wallet = await this.db.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const payment = await this.db.payment.create({
      data: {
        walletId: wallet.id,
        amount,
        status: 'PENDING',
      },
    });

    const depositAmount = Number(payment.amount.toString());

    try {
      const requested = await this.zarinpal.requestPayment({
        amount: depositAmount,
        description: `Wallet deposit ${payment.id}`,
        callbackOrderId: payment.id,
        email: user?.email,
      });

      await this.db.payment.update({
        where: { id: payment.id },
        data: { authority: requested.authority },
      });

      return {
        paymentId: payment.id,
        authority: requested.authority,
        paymentUrl: requested.paymentUrl,
        amount: depositAmount,
      };
    } catch (error) {
      await this.db.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });

      throw error;
    }
  }

  async handleCallback(
    authority: string | undefined,
    status: string | undefined,
  ) {
    if (!authority) {
      throw new BadRequestException('Missing payment authority');
    }

    const payment = await this.db.payment.findUnique({
      where: { authority },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (status !== 'OK') {
      if (payment.status === 'PAID') {
        return {
          status: 'PAID',
          alreadyVerified: true,
          authority,
          refId: payment.refId,
        };
      }

      return {
        status: 'NOK',
        authority,
      };
    }

    if (payment.status === 'PAID') {
      return {
        status: 'PAID',
        alreadyVerified: true,
        authority,
        refId: payment.refId,
      };
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment is not pending verification');
    }

    if (!payment.authority) {
      throw new BadRequestException('Missing payment authority');
    }

    const storedAuthority = payment.authority;
    const amount = Number(payment.amount.toString());
    const verified = await this.zarinpal.verifyPayment({
      amount,
      authority: storedAuthority,
    });

    // 100 = first successful verify, 101 = already verified at ZarinPal
    if (verified.code !== 100 && verified.code !== 101) {
      await this.db.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: 'FAILED' },
      });

      throw new BadRequestException('Payment verification failed');
    }

    return this.settleVerifiedPayment(storedAuthority, verified.refId);
  }

  private async settleVerifiedPayment(authority: string, refId?: string) {
    const result = await this.db.$transaction(async (tx) => {
      const [updatedPayment] = await tx.payment.updateManyAndReturn({
        where: {
          authority,
          status: 'PENDING',
        },
        data: {
          status: 'PAID',
          refId: refId ?? null,
        },
        select: {
          walletId: true,
          amount: true,
          refId: true,
        },
      });

      if (!updatedPayment) {
        const existing = await tx.payment.findUnique({
          where: { authority },
          select: {
            status: true,
            refId: true,
          },
        });

        if (existing?.status === 'PAID') {
          return {
            status: 'PAID' as const,
            alreadyVerified: true,
            authority,
            refId: existing.refId,
          };
        }

        throw new BadRequestException('Payment cannot be settled');
      }

      const wallet = await tx.wallet.update({
        where: { id: updatedPayment.walletId },
        data: {
          balance: { increment: updatedPayment.amount },
        },
        select: {
          userId: true,
          balance: true,
          currency: true,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: updatedPayment.walletId,
          amount: updatedPayment.amount,
          type: 'DEPOSIT',
        },
      });

      return {
        status: 'PAID' as const,
        alreadyVerified: false,
        authority,
        refId: updatedPayment.refId,
        balance: wallet.balance,
        currency: wallet.currency,
        userId: wallet.userId,
        amount: updatedPayment.amount,
      };
    });

    if (
      result.status === 'PAID' &&
      !result.alreadyVerified &&
      result.userId &&
      result.amount
    ) {
      try {
        await this.notificationsService.createDepositSuccess(result.userId, {
          amount: Number(result.amount),
          currency: result.currency ?? 'IRR',
          refId: result.refId,
        });
      } catch {
        // A verified deposit must still succeed if notification persistence fails.
      }
    }

    return {
      status: result.status,
      alreadyVerified: result.alreadyVerified,
      authority: result.authority,
      refId: result.refId,
      balance: toJsonNumber(result.balance),
      currency: result.currency,
    };
  }
}
