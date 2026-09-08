import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common';
import { PaymentsService } from '../payments/payments.service';
import { getBrowserDepositCallbackUrl } from '../payments/zarinpal.config';
import { FinancialDestinationsService } from '../financial-destinations/financial-destinations.service';
import { TransactionsService } from '../transactions/transactions.service';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { WalletsService } from './wallets.service';

@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly transactionsService: TransactionsService,
    private readonly paymentsService: PaymentsService,
    private readonly financialDestinationsService: FinancialDestinationsService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.walletsService.getMyWallet(user.id);
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  getBalance(@CurrentUser() user: AuthenticatedUser) {
    return this.walletsService.getBalance(user.id);
  }

  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  deposit(@CurrentUser() user: AuthenticatedUser, @Body() dto: DepositDto) {
    return this.paymentsService.createDeposit(user.id, dto.amount);
  }

  @Get('deposit/callback')
  @SkipThrottle()
  async handleDepositCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('Authority') authority: string,
    @Query('Status') status: string,
    @Query('authority') authorityAlt?: string,
    @Query('status') statusAlt?: string,
  ) {
    const resolvedAuthority = authority ?? authorityAlt;
    const resolvedStatus = status ?? statusAlt;
    const result = await this.paymentsService.handleCallback(
      resolvedAuthority,
      resolvedStatus,
    );

    const accept = String(req.headers.accept ?? '');
    const isBrowserNavigation =
      accept.includes('text/html') && !accept.includes('application/json');
    if (isBrowserNavigation) {
      const target = new URL(getBrowserDepositCallbackUrl());
      if (resolvedAuthority) {
        target.searchParams.set('Authority', resolvedAuthority);
      }
      if (resolvedStatus) {
        target.searchParams.set('Status', resolvedStatus);
      }
      res.redirect(302, target.toString());
      return;
    }

    return result;
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  async withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WithdrawDto,
  ) {
    if (
      (dto.accountNumber === undefined && dto.shabaNumber === undefined) ||
      (dto.accountNumber !== undefined && dto.shabaNumber !== undefined)
    ) {
      throw new BadRequestException(
        'Provide exactly one account number or Shaba number',
      );
    }

    const result = await this.transactionsService.withdraw(
      user.id,
      dto.amount,
      {
        reason: dto.reason,
        category: dto.category,
        envelopeId: dto.envelopeId,
      },
    );

    if (dto.accountNumber) {
      await this.financialDestinationsService.recordBankAccount(user.id, {
        accountNumber: dto.accountNumber,
      });
    } else if (dto.shabaNumber) {
      await this.financialDestinationsService.recordShaba(user.id, {
        shabaNumber: dto.shabaNumber,
      });
    }

    return result;
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  transfer(@CurrentUser() user: AuthenticatedUser, @Body() dto: TransferDto) {
    return this.transactionsService.transferToUser(
      user.id,
      dto.recipient,
      dto.amount,
      {
        reason: dto.reason,
        category: dto.category,
        envelopeId: dto.envelopeId,
      },
    );
  }
}
