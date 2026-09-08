import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './database/database.module';
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
import { loggerParams } from './common/logger.config';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        process.env.NODE_ENV === 'test'
          ? {
              ttl: 60_000,
              limit: 10_000,
            }
          : {
              ttl: 10_000,
              limit: 60,
            },
      ],
    }),
    LoggerModule.forRoot(loggerParams),
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
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
