import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';

@Module({
  imports: [TransactionsModule, PaymentsModule],
  controllers: [WalletsController],
  providers: [WalletsService],
})
export class WalletsModule {}
