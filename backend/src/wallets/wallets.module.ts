import { Module } from '@nestjs/common';
import { TransactionsModule } from '../transactions/transactions.module';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';

@Module({
  imports: [TransactionsModule],
  controllers: [WalletsController],
  providers: [WalletsService],
})
export class WalletsModule {}
