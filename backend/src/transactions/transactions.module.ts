import { Module } from '@nestjs/common';
import { FinancialDestinationsModule } from '../financial-destinations/financial-destinations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SecurityModule } from '../security/security.module';
import { SpendingLimitsModule } from '../spending-limits/spending-limits.module';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [
    NotificationsModule,
    SpendingLimitsModule,
    FinancialDestinationsModule,
    SecurityModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
