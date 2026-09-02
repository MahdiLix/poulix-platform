import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SpendingLimitsModule } from '../spending-limits/spending-limits.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ScheduledPaymentsController } from './scheduled-payments.controller';
import { ScheduledPaymentsScheduler } from './scheduled-payments.scheduler';
import { ScheduledPaymentsService } from './scheduled-payments.service';

@Module({
  imports: [TransactionsModule, NotificationsModule, SpendingLimitsModule],
  controllers: [ScheduledPaymentsController],
  providers: [ScheduledPaymentsService, ScheduledPaymentsScheduler],
  exports: [ScheduledPaymentsService],
})
export class ScheduledPaymentsModule {}
