import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly db: DatabaseService) {}

  async withdraw(userId: string, amount: number) {
    return this.db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const [updatedWallet] = await tx.wallet.updateManyAndReturn({
        where: {
          id: wallet.id,
          balance: { gte: amount },
        },
        data: {
          balance: { decrement: amount },
        },
        select: {
          balance: true,
          currency: true,
        },
      });

      if (!updatedWallet) {
        throw new BadRequestException('Insufficient funds');
      }

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'WITHDRAWAL',
        },
      });

      return updatedWallet;
    });
  }

  async deposit(userId: string, amount: number) {
    return this.db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
        },
        select: {
          balance: true,
          currency: true,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'DEPOSIT',
        },
      });

      return updatedWallet;
    });
  }

  async getWalletTransactions(userId: string) {
    const wallet = await this.db.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    // Using the index defined in your schema: @@index([walletId, createdAt])
    return this.db.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
