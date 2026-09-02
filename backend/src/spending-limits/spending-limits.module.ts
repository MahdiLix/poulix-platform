import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SpendingLimitsController } from './spending-limits.controller';
import { SpendingLimitsService } from './spending-limits.service';

@Module({
  imports: [NotificationsModule],
  controllers: [SpendingLimitsController],
  providers: [SpendingLimitsService],
  exports: [SpendingLimitsService],
})
export class SpendingLimitsModule {}
