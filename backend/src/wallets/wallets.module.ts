import { Module } from '@nestjs/common';
import { FinancialDestinationsModule } from '../financial-destinations/financial-destinations.module';
import { PaymentsModule } from '../payments/payments.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';

@Module({
  imports: [TransactionsModule, PaymentsModule, FinancialDestinationsModule],
  controllers: [WalletsController],
  providers: [WalletsService],
})
export class WalletsModule {}
