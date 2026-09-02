import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FinancialDestinationType } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import {
  decryptValue,
  encryptValue,
  hashIdentifier,
  maskAccountNumber,
  maskCard,
  maskShaba,
  normalizeAccountNumber,
  normalizeCardNumber,
  normalizeShaba,
} from '../common/financial-crypto';
import type { CreateSavedDestinationDto } from './dto/create-saved-destination.dto';

type RecordP2PInput = {
  recipientUserId: string;
  recipientUsername: string;
};

type RecordBankInput = {
  accountNumber: string;
};

type RecordShabaInput = {
  shabaNumber: string;
};

type RecordCardInput = {
  cardNumber: string;
};

@Injectable()
export class FinancialDestinationsService {
  constructor(private readonly db: DatabaseService) {}

  async listRecent(userId: string, limit = 10) {
    const destinations = await this.db.financialDestination.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
      take: limit,
    });

    return destinations.map((destination) => this.serialize(destination));
  }

  async listSaved(userId: string) {
    const destinations = await this.db.financialDestination.findMany({
      where: { userId, isSaved: true },
      orderBy: { label: 'asc' },
    });

    return destinations.map((destination) => this.serialize(destination));
  }

  async createSaved(userId: string, dto: CreateSavedDestinationDto) {
    const payload = await this.resolveDestinationPayload(userId, dto);
    const destination = await this.upsertDestination(userId, payload, {
      isSaved: true,
      label: dto.label.trim(),
    });

    return this.serialize(destination);
  }

  async updateSavedLabel(userId: string, id: string, label: string) {
    const existing = await this.db.financialDestination.findFirst({
      where: { id, userId, isSaved: true },
    });

    if (!existing) {
      throw new NotFoundException('Saved destination not found');
    }

    const updated = await this.db.financialDestination.update({
      where: { id },
      data: { label: label.trim() },
    });

    return this.serialize(updated);
  }

  async deleteSaved(userId: string, id: string) {
    const existing = await this.db.financialDestination.findFirst({
      where: { id, userId, isSaved: true },
    });

    if (!existing) {
      throw new NotFoundException('Saved destination not found');
    }

    await this.db.financialDestination.delete({ where: { id } });
    return { success: true };
  }

  async getValueForOwner(userId: string, id: string) {
    const destination = await this.db.financialDestination.findFirst({
      where: { id, userId },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    if (destination.type === 'P2P_USER') {
      return {
        type: destination.type,
        recipientUsername: destination.recipientUsername,
        recipientUserId: destination.recipientUserId,
      };
    }

    if (!destination.encryptedValue) {
      throw new BadRequestException('Destination value unavailable');
    }

    const value = decryptValue(destination.encryptedValue);

    if (destination.type === 'BANK_ACCOUNT') {
      return { type: destination.type, accountNumber: value };
    }
    if (destination.type === 'SHABA') {
      return { type: destination.type, shabaNumber: value };
    }
    return { type: destination.type, cardNumber: value };
  }

  async recordP2PRecipient(userId: string, input: RecordP2PInput) {
    await this.upsertDestination(userId, {
      type: 'P2P_USER',
      identifierHash: hashIdentifier(input.recipientUserId),
      maskedValue: input.recipientUsername,
      label: input.recipientUsername,
      recipientUserId: input.recipientUserId,
      recipientUsername: input.recipientUsername,
      encryptedValue: null,
    });
  }

  async recordBankAccount(userId: string, input: RecordBankInput) {
    const normalized = normalizeAccountNumber(input.accountNumber);
    await this.upsertDestination(userId, {
      type: 'BANK_ACCOUNT',
      identifierHash: hashIdentifier(normalized),
      maskedValue: maskAccountNumber(normalized),
      label: maskAccountNumber(normalized),
      encryptedValue: encryptValue(normalized),
    });
  }

  async recordShaba(userId: string, input: RecordShabaInput) {
    const normalized = normalizeShaba(input.shabaNumber);
    await this.upsertDestination(userId, {
      type: 'SHABA',
      identifierHash: hashIdentifier(normalized),
      maskedValue: maskShaba(normalized),
      label: maskShaba(normalized),
      encryptedValue: encryptValue(normalized),
    });
  }

  async recordCard(userId: string, input: RecordCardInput) {
    const normalized = normalizeCardNumber(input.cardNumber);
    await this.upsertDestination(userId, {
      type: 'CARD',
      identifierHash: hashIdentifier(normalized),
      maskedValue: maskCard(normalized),
      label: maskCard(normalized),
      encryptedValue: encryptValue(normalized),
    });
  }

  private async resolveDestinationPayload(
    userId: string,
    dto: CreateSavedDestinationDto,
  ) {
    if (dto.type === 'P2P_USER') {
      const recipient = dto.recipient?.trim();
      if (!recipient) {
        throw new BadRequestException('Recipient is required');
      }

      const user = await this.db.user.findFirst({
        where: {
          OR: [{ email: recipient }, { username: recipient }],
        },
        select: { id: true, username: true },
      });

      if (!user) {
        throw new BadRequestException('Recipient not found');
      }

      if (user.id === userId) {
        throw new BadRequestException('Cannot save yourself as a recipient');
      }

      return {
        type: 'P2P_USER' as FinancialDestinationType,
        identifierHash: hashIdentifier(user.id),
        maskedValue: user.username,
        label: dto.label.trim(),
        recipientUserId: user.id,
        recipientUsername: user.username,
        encryptedValue: null,
      };
    }

    if (dto.type === 'BANK_ACCOUNT' && dto.accountNumber) {
      const normalized = normalizeAccountNumber(dto.accountNumber);
      return {
        type: 'BANK_ACCOUNT' as FinancialDestinationType,
        identifierHash: hashIdentifier(normalized),
        maskedValue: maskAccountNumber(normalized),
        label: dto.label.trim(),
        encryptedValue: encryptValue(normalized),
      };
    }

    if (dto.type === 'SHABA' && dto.shabaNumber) {
      const normalized = normalizeShaba(dto.shabaNumber);
      return {
        type: 'SHABA' as FinancialDestinationType,
        identifierHash: hashIdentifier(normalized),
        maskedValue: maskShaba(normalized),
        label: dto.label.trim(),
        encryptedValue: encryptValue(normalized),
      };
    }

    if (dto.type === 'CARD' && dto.cardNumber) {
      const normalized = normalizeCardNumber(dto.cardNumber);
      return {
        type: 'CARD' as FinancialDestinationType,
        identifierHash: hashIdentifier(normalized),
        maskedValue: maskCard(normalized),
        label: dto.label.trim(),
        encryptedValue: encryptValue(normalized),
      };
    }

    throw new BadRequestException('Invalid destination payload');
  }

  private async upsertDestination(
    userId: string,
    payload: {
      type: FinancialDestinationType;
      identifierHash: string;
      maskedValue: string;
      label: string;
      recipientUserId?: string | null;
      recipientUsername?: string | null;
      encryptedValue?: string | null;
    },
    options?: { isSaved?: boolean; label?: string },
  ) {
    const existing = await this.db.financialDestination.findUnique({
      where: {
        userId_type_identifierHash: {
          userId,
          type: payload.type,
          identifierHash: payload.identifierHash,
        },
      },
    });

    if (existing) {
      return this.db.financialDestination.update({
        where: { id: existing.id },
        data: {
          label: options?.label ?? existing.label,
          maskedValue: payload.maskedValue,
          recipientUserId: payload.recipientUserId ?? null,
          recipientUsername: payload.recipientUsername ?? null,
          encryptedValue: payload.encryptedValue ?? existing.encryptedValue,
          isSaved: options?.isSaved ?? existing.isSaved,
          useCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    }

    return this.db.financialDestination.create({
      data: {
        userId,
        type: payload.type,
        label: options?.label ?? payload.label,
        maskedValue: payload.maskedValue,
        identifierHash: payload.identifierHash,
        encryptedValue: payload.encryptedValue,
        recipientUserId: payload.recipientUserId ?? null,
        recipientUsername: payload.recipientUsername ?? null,
        isSaved: options?.isSaved ?? false,
      },
    });
  }

  private serialize(destination: {
    id: string;
    type: FinancialDestinationType;
    label: string;
    maskedValue: string;
    recipientUserId: string | null;
    recipientUsername: string | null;
    isSaved: boolean;
    useCount: number;
    lastUsedAt: Date;
    createdAt: Date;
  }) {
    return {
      id: destination.id,
      type: destination.type,
      label: destination.label,
      maskedValue: destination.maskedValue,
      recipientUserId: destination.recipientUserId,
      recipientUsername: destination.recipientUsername,
      isSaved: destination.isSaved,
      useCount: destination.useCount,
      lastUsedAt: destination.lastUsedAt,
      createdAt: destination.createdAt,
    };
  }
}
