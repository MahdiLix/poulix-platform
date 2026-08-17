import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class WalletsService {
  constructor(private readonly db: DatabaseService) {}

  async getMyWallet(userId: string) {
    const wallet = await this.db.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        balance: true,
        currency: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.db.wallet.findUnique({
      where: { userId },
      select: {
        balance: true,
        currency: true,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }
}
