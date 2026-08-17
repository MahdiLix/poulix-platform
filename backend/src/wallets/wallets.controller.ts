import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common';
import { PaymentsService } from '../payments/payments.service';
import { TransactionsService } from '../transactions/transactions.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { WalletsService } from './wallets.service';

@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly transactionsService: TransactionsService,
    private readonly paymentsService: PaymentsService,
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
  handleDepositCallback(
    @Query('Authority') authority: string,
    @Query('Status') status: string,
    @Query('authority') authorityAlt?: string,
    @Query('status') statusAlt?: string,
  ) {
    return this.paymentsService.handleCallback(
      authority ?? authorityAlt,
      status ?? statusAlt,
    );
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  withdraw(@CurrentUser() user: AuthenticatedUser, @Body() dto: WithdrawDto) {
    if (
      (dto.accountNumber === undefined && dto.shabaNumber === undefined) ||
      (dto.accountNumber !== undefined && dto.shabaNumber !== undefined)
    ) {
      throw new BadRequestException(
        'Provide exactly one account number or Shaba number',
      );
    }

    return this.transactionsService.withdraw(user.id, dto.amount);
  }
}
