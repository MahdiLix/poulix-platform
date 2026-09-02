import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsService } from './payments.service';
import { ZarinpalService } from './zarinpal.service';

@Module({
  imports: [NotificationsModule],
  providers: [ZarinpalService, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
