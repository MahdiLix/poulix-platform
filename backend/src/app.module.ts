import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RequestLoggingModule } from './request-logging/request-logging.module';
import { AuditLoggingModule } from './audit-logging/audit-logging.module';
import { RateLimitModule } from './rate-limit';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ScheduledPaymentsModule } from './scheduled-payments/scheduled-payments.module';
import { GoalsModule } from './goals/goals.module';
import { EnvelopesModule } from './envelopes/envelopes.module';
import { FinancialDestinationsModule } from './financial-destinations/financial-destinations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SecurityModule } from './security/security.module';
import { SpendingLimitsModule } from './spending-limits/spending-limits.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    RateLimitModule,
    RequestLoggingModule,
    AuditLoggingModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    WalletsModule,
    TransactionsModule,
    ScheduledPaymentsModule,
    GoalsModule,
    EnvelopesModule,
    NotificationsModule,
    FinancialDestinationsModule,
    SpendingLimitsModule,
    SecurityModule,
    AdminModule,
  ],
})
export class AppModule {}
