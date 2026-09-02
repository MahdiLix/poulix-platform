import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { CreateEnvelopeDto } from './dto/create-envelope.dto';

function envelopeReason(name: string, action: 'allocate' | 'release') {
  return action === 'allocate'
    ? `Envelope allocation: ${name}`
    : `Envelope release: ${name}`;
}

@Injectable()
export class EnvelopesService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, dto: CreateEnvelopeDto) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Envelope name is required');
    }

    const description = dto.description?.trim() || undefined;

    return this.db.envelope.create({
      data: {
        userId,
        name,
        description,
        status: 'ACTIVE',
      },
    });
  }

  async listForUser(userId: string) {
    const envelopes = await this.db.envelope.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const totals = await this.db.envelope.aggregate({
      where: { userId, status: 'ACTIVE' },
      _sum: { allocatedAmount: true },
    });

    return {
      envelopes,
      summary: {
        totalAllocatedInEnvelopes: totals._sum.allocatedAmount ?? 0,
      },
    };
  }

  async getByIdForUser(userId: string, id: string) {
    const envelope = await this.db.envelope.findFirst({
      where: { id, userId },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!envelope) {
      throw new NotFoundException('Envelope not found');
    }

    return envelope;
  }

  async allocate(userId: string, envelopeId: string, amount: number) {
    return this.moveFunds(userId, envelopeId, amount, 'ALLOCATE');
  }

  async release(userId: string, envelopeId: string, amount: number) {
    return this.moveFunds(userId, envelopeId, amount, 'RELEASE');
  }

  async cancel(userId: string, envelopeId: string) {
    const envelope = await this.db.envelope.findFirst({
      where: { id: envelopeId, userId },
    });

    if (!envelope) {
      throw new NotFoundException('Envelope not found');
    }

    if (envelope.status !== 'ACTIVE') {
      throw new BadRequestException('Envelope cannot be cancelled');
    }

    const allocated = Number(envelope.allocatedAmount);
    if (allocated > 0) {
      throw new BadRequestException(
        'Release envelope balance before cancelling',
      );
    }

    return this.db.envelope.update({
      where: { id: envelopeId },
      data: { status: 'CANCELLED' },
    });
  }

  private async moveFunds(
    userId: string,
    envelopeId: string,
    amount: number,
    direction: 'ALLOCATE' | 'RELEASE',
  ) {
    return this.db.$transaction(async (tx) => {
      const envelope = await tx.envelope.findFirst({
        where: { id: envelopeId, userId },
      });

      if (!envelope) {
        throw new NotFoundException('Envelope not found');
      }

      if (envelope.status !== 'ACTIVE') {
        throw new BadRequestException('Envelope is not active');
      }

      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true, balance: true, currency: true },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      if (direction === 'ALLOCATE') {
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

        const updatedEnvelope = await tx.envelope.update({
          where: { id: envelope.id },
          data: {
            allocatedAmount: { increment: amount },
          },
        });

        const transaction = await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount,
            type: 'ENVELOPE_ALLOCATE',
            reason: envelopeReason(envelope.name, 'allocate'),
            envelopeId: envelope.id,
          },
        });

        await tx.envelopeMovement.create({
          data: {
            envelopeId: envelope.id,
            amount,
            type: 'ALLOCATE',
            transactionId: transaction.id,
          },
        });

        return {
          envelope: updatedEnvelope,
          balance: updatedWallet.balance,
          currency: updatedWallet.currency,
        };
      }

      const allocated = Number(envelope.allocatedAmount);
      if (amount > allocated) {
        throw new BadRequestException('Amount exceeds envelope balance');
      }

      const [updatedEnvelope] = await tx.envelope.updateManyAndReturn({
        where: {
          id: envelope.id,
          allocatedAmount: { gte: amount },
        },
        data: {
          allocatedAmount: { decrement: amount },
        },
      });

      if (!updatedEnvelope) {
        throw new BadRequestException('Amount exceeds envelope balance');
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

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: 'ENVELOPE_RELEASE',
          reason: envelopeReason(envelope.name, 'release'),
          envelopeId: envelope.id,
        },
      });

      await tx.envelopeMovement.create({
        data: {
          envelopeId: envelope.id,
          amount,
          type: 'RELEASE',
          transactionId: transaction.id,
        },
      });

      return {
        envelope: updatedEnvelope,
        balance: updatedWallet.balance,
        currency: updatedWallet.currency,
      };
    });
  }
}
