import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { TransactionsModule } from './transactions/transactions.module';
import { loggerParams } from './common/logger.config';

@Module({
  imports: [
    LoggerModule.forRoot(loggerParams),
    DatabaseModule,
    AuthModule,
    UsersModule,
    WalletsModule,
    TransactionsModule,
  ],
})
export class AppModule {}
