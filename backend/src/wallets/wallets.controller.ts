import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, type AuthenticatedUser } from '../common';
import { TransactionsService } from '../transactions/transactions.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { WalletsService } from './wallets.service';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get('me')
  getMyWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.walletsService.getMyWallet(user.id);
  }

  @Get('balance')
  getBalance(@CurrentUser() user: AuthenticatedUser) {
    return this.walletsService.getBalance(user.id);
  }

  @Post('deposit')
  deposit(@CurrentUser() user: AuthenticatedUser, @Body() dto: DepositDto) {
    return this.transactionsService.deposit(user.id, dto.amount);
  }

  @Post('withdraw')
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
